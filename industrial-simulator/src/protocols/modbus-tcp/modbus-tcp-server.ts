import { createServer, type Server, type Socket } from 'node:net';
import type { RegisterType } from '../../domain/types.js';
import type { ParameterStore } from '../../simulation/parameter-store.js';
import type { ProtocolServerConfig } from '../../domain/types.js';
import type { ProtocolServer } from '../core/protocol-server.js';
import { encodeBoolean, encodeRegisters, registerLength } from './value-codec.js';

const READ_COILS = 1;
const READ_DISCRETE_INPUTS = 2;
const READ_HOLDING_REGISTERS = 3;
const READ_INPUT_REGISTERS = 4;

export class ModbusTcpServer implements ProtocolServer {
  private server: Server | undefined;
  private readonly buffers = new WeakMap<Socket, Buffer>();

  constructor(
    private readonly config: ProtocolServerConfig,
    private readonly parameterStore: ParameterStore,
    private readonly callbacks: { onRequest?: () => void; onError?: () => void } = {}
  ) {}

  async start(): Promise<void> {
    if (this.server) {
      return;
    }
    const host = this.config.host ?? '0.0.0.0';
    const port = this.config.port ?? 502;
    this.server = createServer((socket) => this.handleSocket(socket));
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(port, host, () => {
        this.server?.off('error', reject);
        resolve();
      });
    });
    console.log(`modbus-tcp server ${this.config.id} listening on ${host}:${port}`);
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    const server = this.server;
    this.server = undefined;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private handleSocket(socket: Socket): void {
    socket.on('data', (chunk) => {
      const previous = this.buffers.get(socket) ?? Buffer.alloc(0);
      let buffer = Buffer.concat([previous, chunk]);

      while (buffer.length >= 7) {
        const length = buffer.readUInt16BE(4);
        const frameLength = 6 + length;
        if (buffer.length < frameLength) {
          break;
        }
        const frame = buffer.subarray(0, frameLength);
        buffer = buffer.subarray(frameLength);
        const response = this.handleFrame(frame);
        socket.write(response);
      }

      this.buffers.set(socket, buffer);
    });
    socket.on('error', () => this.callbacks.onError?.());
  }

  private handleFrame(frame: Buffer): Buffer {
    this.callbacks.onRequest?.();
    const transactionId = frame.readUInt16BE(0);
    const protocolId = frame.readUInt16BE(2);
    const unitId = frame.readUInt8(6);
    const functionCode = frame.readUInt8(7);

    if (protocolId !== 0 || frame.length < 12) {
      this.callbacks.onError?.();
      return this.exception(transactionId, unitId, functionCode, 1);
    }

    const startAddress = frame.readUInt16BE(8);
    const quantity = frame.readUInt16BE(10);

    try {
      switch (functionCode) {
        case READ_HOLDING_REGISTERS:
          return this.readRegisters(transactionId, unitId, functionCode, 'holding-register', startAddress, quantity);
        case READ_INPUT_REGISTERS:
          return this.readRegisters(transactionId, unitId, functionCode, 'input-register', startAddress, quantity);
        case READ_COILS:
          return this.readBits(transactionId, unitId, functionCode, 'coil', startAddress, quantity);
        case READ_DISCRETE_INPUTS:
          return this.readBits(transactionId, unitId, functionCode, 'discrete-input', startAddress, quantity);
        default:
          return this.exception(transactionId, unitId, functionCode, 1);
      }
    } catch (error) {
      this.callbacks.onError?.();
      if (error instanceof ModbusException) {
        return this.exception(transactionId, unitId, functionCode, error.code);
      }
      return this.exception(transactionId, unitId, functionCode, 4);
    }
  }

  private readRegisters(
    transactionId: number,
    unitId: number,
    functionCode: number,
    registerType: RegisterType,
    startAddress: number,
    quantity: number
  ): Buffer {
    if (quantity < 1 || quantity > 125) {
      return this.exception(transactionId, unitId, functionCode, 3);
    }
    const registerMap = this.buildRegisterMap(unitId, registerType);
    const values: number[] = [];
    for (let address = startAddress; address < startAddress + quantity; address += 1) {
      const value = registerMap.get(address);
      if (value === undefined) {
        return this.exception(transactionId, unitId, functionCode, 2);
      }
      values.push(value);
    }
    const payload = Buffer.alloc(2 + values.length * 2);
    payload.writeUInt8(functionCode, 0);
    payload.writeUInt8(values.length * 2, 1);
    values.forEach((value, index) => payload.writeUInt16BE(value & 0xffff, 2 + index * 2));
    return this.response(transactionId, unitId, payload);
  }

  private readBits(
    transactionId: number,
    unitId: number,
    functionCode: number,
    registerType: RegisterType,
    startAddress: number,
    quantity: number
  ): Buffer {
    if (quantity < 1 || quantity > 2000) {
      return this.exception(transactionId, unitId, functionCode, 3);
    }
    const bitMap = this.buildBitMap(unitId, registerType);
    const byteCount = Math.ceil(quantity / 8);
    const payload = Buffer.alloc(2 + byteCount);
    payload.writeUInt8(functionCode, 0);
    payload.writeUInt8(byteCount, 1);
    for (let index = 0; index < quantity; index += 1) {
      const address = startAddress + index;
      const value = bitMap.get(address);
      if (value === undefined) {
        return this.exception(transactionId, unitId, functionCode, 2);
      }
      if (value) {
        payload[2 + Math.floor(index / 8)] |= 1 << index % 8;
      }
    }
    return this.response(transactionId, unitId, payload);
  }

  private buildRegisterMap(unitId: number, registerType: RegisterType): Map<number, number> {
    const map = new Map<number, number>();
    const lookups = this.parameterStore.listMapped(this.config.id, unitId, registerType);
    for (const lookup of lookups) {
      if (lookup.value.quality === 'offline' || lookup.value.quality === 'timeout') {
        throw new ModbusException(11);
      }
      const words = encodeRegisters(lookup.value.value, lookup.parameter.dataType, {
        byteOrder: this.config.byteOrder ?? 'big-endian',
        wordOrder: this.config.wordOrder ?? 'big-endian'
      }, lookup.mapping.length);
      const count = registerLength(lookup.parameter.dataType, registerType, lookup.mapping.length);
      for (let offset = 0; offset < count; offset += 1) {
        map.set(lookup.mapping.address + offset, words[offset] ?? 0);
      }
    }
    return map;
  }

  private buildBitMap(unitId: number, registerType: RegisterType): Map<number, boolean> {
    const map = new Map<number, boolean>();
    const lookups = this.parameterStore.listMapped(this.config.id, unitId, registerType);
    for (const lookup of lookups) {
      if (lookup.value.quality === 'offline' || lookup.value.quality === 'timeout') {
        throw new ModbusException(11);
      }
      map.set(lookup.mapping.address, encodeBoolean(lookup.value.value));
    }
    return map;
  }

  private response(transactionId: number, unitId: number, pdu: Buffer): Buffer {
    const header = Buffer.alloc(7);
    header.writeUInt16BE(transactionId, 0);
    header.writeUInt16BE(0, 2);
    header.writeUInt16BE(pdu.length + 1, 4);
    header.writeUInt8(unitId, 6);
    return Buffer.concat([header, pdu]);
  }

  private exception(transactionId: number, unitId: number, functionCode: number, code: number): Buffer {
    const pdu = Buffer.from([functionCode | 0x80, code]);
    return this.response(transactionId, unitId, pdu);
  }
}

class ModbusException extends Error {
  constructor(readonly code: number) {
    super(`Modbus exception ${code}`);
  }
}
