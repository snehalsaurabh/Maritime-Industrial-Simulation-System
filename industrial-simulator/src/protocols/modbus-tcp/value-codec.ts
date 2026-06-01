import type { DataType, ParameterPrimitive, RegisterType } from '../../domain/types.js';

export interface CodecOptions {
  byteOrder: 'big-endian' | 'little-endian';
  wordOrder: 'big-endian' | 'little-endian';
  stringRegisterLength?: number;
}

export function registerLength(dataType: DataType, registerType: RegisterType, configured?: number): number {
  if (configured) {
    return configured;
  }
  if (registerType === 'coil' || registerType === 'discrete-input') {
    return 1;
  }
  switch (dataType) {
    case 'boolean':
    case 'int16':
    case 'uint16':
      return 1;
    case 'int32':
    case 'uint32':
    case 'float32':
      return 2;
    case 'int64':
    case 'uint64':
    case 'float64':
      return 4;
    case 'string':
      return 16;
  }
}

export function encodeRegisters(
  value: ParameterPrimitive,
  dataType: DataType,
  options: CodecOptions,
  length?: number
): number[] {
  const registerCount = registerLength(dataType, 'holding-register', length);
  const buffer = Buffer.alloc(registerCount * 2);
  switch (dataType) {
    case 'boolean':
      buffer.writeUInt16BE(value ? 1 : 0, 0);
      break;
    case 'int16':
      buffer.writeInt16BE(Number(value), 0);
      break;
    case 'uint16':
      buffer.writeUInt16BE(Number(value), 0);
      break;
    case 'int32':
      buffer.writeInt32BE(Number(value), 0);
      break;
    case 'uint32':
      buffer.writeUInt32BE(Number(value), 0);
      break;
    case 'float32':
      buffer.writeFloatBE(Number(value), 0);
      break;
    case 'float64':
      buffer.writeDoubleBE(Number(value), 0);
      break;
    case 'int64':
      buffer.writeBigInt64BE(BigInt(Math.trunc(Number(value))), 0);
      break;
    case 'uint64':
      buffer.writeBigUInt64BE(BigInt(Math.trunc(Number(value))), 0);
      break;
    case 'string':
      buffer.write(String(value).slice(0, buffer.length), 0, 'utf8');
      break;
  }
  const words: number[] = [];
  for (let offset = 0; offset < buffer.length; offset += 2) {
    words.push(buffer.readUInt16BE(offset));
  }
  return options.wordOrder === 'little-endian' ? words.reverse() : words;
}

export function encodeBoolean(value: ParameterPrimitive): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return String(value).toLowerCase() === 'true';
}
