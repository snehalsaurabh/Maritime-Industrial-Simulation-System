import { createServer, type Server, type Socket } from 'node:net';
import type { DeviceDefinition, ProtocolServerConfig, SimulatorConfig } from '../../domain/types.js';
import type { ParameterRegistry } from '../../parameters/parameter-registry.js';
import type { ProtocolServer } from '../core/protocol-server.js';
import { buildDeviceSentences, type NmeaSentenceSnapshot } from './sentence-builder.js';

export class NmeaTcpServer implements ProtocolServer {
  private server: Server | undefined;
  private interval: NodeJS.Timeout | undefined;
  private readonly sockets = new Set<Socket>();
  private lastEmitted: NmeaSentenceSnapshot[] = [];

  constructor(
    private readonly config: ProtocolServerConfig,
    private readonly simulatorConfig: SimulatorConfig,
    private readonly parameterRegistry: ParameterRegistry,
    private readonly callbacks: { onRequest?: () => void; onError?: () => void } = {}
  ) {}

  async start(): Promise<void> {
    if (this.server) {
      return;
    }
    const host = this.config.host ?? '0.0.0.0';
    const port = this.config.port ?? 10110;
    this.server = createServer((socket) => {
      this.sockets.add(socket);
      socket.on('close', () => this.sockets.delete(socket));
      socket.on('error', () => {
        this.callbacks.onError?.();
        this.sockets.delete(socket);
      });
      this.emitSentences();
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(port, host, () => {
        this.server?.off('error', reject);
        resolve();
      });
    });

    const intervalMs = this.config.sentenceIntervalMs ?? this.simulatorConfig.simulator?.updateIntervalMs ?? 1000;
    this.interval = setInterval(() => this.emitSentences(), intervalMs);
    console.log(`nmea0183 server ${this.config.id} listening on ${host}:${port}`);
  }

  async stop(): Promise<void> {
    // Stop the emission interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    
    if (!this.server) {
      return;
    }
    
    const server = this.server;
    this.server = undefined;
    
    // Forcefully close all active connections
    server.closeAllConnections();
    
    // Clear socket tracking
    this.sockets.clear();
    
    // Close the server
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  getLastEmitted(): NmeaSentenceSnapshot[] {
    return this.lastEmitted;
  }

  private emitSentences(): void {
    const devices = this.boundDevices();
    if (devices.length === 0) {
      this.lastEmitted = [];
      return;
    }

    const emitted: NmeaSentenceSnapshot[] = [];
    const payload: string[] = [];
    for (const device of devices) {
      const talkerId = device.protocol.talkerId ?? this.config.talkerId ?? 'GP';
      const sentences = buildDeviceSentences(device, this.parameterRegistry, talkerId);
      emitted.push(...sentences);
      for (const sentence of sentences) {
        payload.push(`${sentence.line}\r\n`);
      }
    }

    this.lastEmitted = emitted;
    if (payload.length === 0 || this.sockets.size === 0) {
      return;
    }

    const data = payload.join('');
    for (const socket of this.sockets) {
      if (!socket.destroyed) {
        socket.write(data);
        this.callbacks.onRequest?.();
      }
    }
  }

  private boundDevices(): DeviceDefinition[] {
    return this.simulatorConfig.devices.filter(
      (device) =>
        device.protocol.serverId === this.config.id &&
        (device.protocol.type === 'nmea0183' || this.config.type === 'nmea0183')
    );
  }
}
