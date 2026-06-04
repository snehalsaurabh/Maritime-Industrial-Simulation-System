import { createServer, type Server } from 'node:http';
import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { dirname } from 'node:path';
import type { ProtocolPlugin, ProtocolServer } from '../protocols/core/protocol-server.js';
import { modbusTcpPlugin } from '../protocols/modbus-tcp/plugin.js';
import { DeviceRegistry } from '../devices/device-registry.js';
import { loadConfig } from '../config/loader.js';
import type { ParameterValue, RuntimeStats, SimulatorConfig } from '../domain/types.js';
import { ParameterRegistry } from '../parameters/parameter-registry.js';
import { SimulationEngine } from '../simulation/simulation-engine.js';

export class SimulatorRuntime {
  private readonly plugins: ProtocolPlugin[] = [modbusTcpPlugin];
  private readonly deviceRegistry = new DeviceRegistry();
  private readonly parameterRegistry = new ParameterRegistry();
  private protocolServers: ProtocolServer[] = [];
  private simulationEngine: SimulationEngine | undefined;
  private config: SimulatorConfig | undefined;
  private watcher: FSWatcher | undefined;
  private healthServer: Server | undefined;
  private stats: RuntimeStats = {
    devices: 0,
    parameters: 0,
    ticks: 0,
    lastTickDurationMs: 0,
    protocolRequests: 0,
    protocolErrors: 0
  };

  constructor(private readonly configPath: string) {}

  async start(options: { watch?: boolean } = {}): Promise<void> {
    const config = await loadConfig(this.configPath);
    await this.applyConfig(config);
    if (config.simulator?.healthPort) {
      await this.startHealthServer(config.simulator.healthPort);
    }
    if (options.watch || config.simulator?.hotReload) {
      this.startWatcher();
    }
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
    this.simulationEngine?.stop();
    for (const server of this.protocolServers) {
      await server.stop();
    }
    await new Promise<void>((resolve, reject) => {
      if (!this.healthServer) {
        resolve();
        return;
      }
      this.healthServer.close((error) => (error ? reject(error) : resolve()));
    });
  }

  getStats(): RuntimeStats {
    const engineStats = this.simulationEngine?.getStats() ?? { ticks: 0, lastTickDurationMs: 0 };
    return {
      ...this.stats,
      ticks: engineStats.ticks,
      lastTickDurationMs: engineStats.lastTickDurationMs
    };
  }

  listValues(): ParameterValue[] {
    return this.parameterRegistry.listValues();
  }

  getConfig(): SimulatorConfig | undefined {
    return this.config;
  }

  private async applyConfig(config: SimulatorConfig): Promise<void> {
    this.config = config;
    this.deviceRegistry.replaceAll(config.devices);
    this.stats.devices = config.devices.length;
    this.stats.parameters = config.devices.reduce((count, device) => count + device.parameters.length, 0);

    this.simulationEngine?.stop();
    this.simulationEngine = new SimulationEngine(this.parameterRegistry, {
      updateIntervalMs: config.simulator?.updateIntervalMs ?? 1000,
      configPath: this.configPath,
      scriptGeneratorsEnabled: config.simulator?.scriptGeneratorsEnabled ?? false
    });
    this.simulationEngine.replaceDevices(config.devices);
    this.simulationEngine.start();

    for (const server of this.protocolServers) {
      await server.stop();
    }
    this.protocolServers = this.plugins.flatMap((plugin) =>
      plugin.createServers({
        simulatorConfig: config,
        protocolConfigs: config.protocols,
        parameterRegistry: this.parameterRegistry,
        onRequest: () => (this.stats.protocolRequests += 1),
        onError: () => (this.stats.protocolErrors += 1)
      })
    );
    for (const server of this.protocolServers) {
      await server.start();
    }
  }

  private startWatcher(): void {
    if (this.watcher) {
      return;
    }
    this.watcher = watch(this.configPath, { ignoreInitial: true });
    this.watcher.on('change', async () => {
      try {
        const config = await loadConfig(this.configPath);
        await this.applyConfig(config);
        console.log(`configuration reloaded from ${this.configPath}`);
      } catch (error) {
        console.error('configuration reload failed', error);
      }
    });
    console.log(`watching configuration in ${dirname(this.configPath)}`);
  }

  private async startHealthServer(port: number): Promise<void> {
    this.healthServer = createServer((request, response) => {
      if (request.url === '/health') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (request.url === '/stats') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(this.getStats()));
        return;
      }
      response.writeHead(404);
      response.end();
    });
    await new Promise<void>((resolve, reject) => {
      this.healthServer?.once('error', reject);
      this.healthServer?.listen(port, '127.0.0.1', () => {
        this.healthServer?.off('error', reject);
        resolve();
      });
    });
    console.log(`health server listening on 127.0.0.1:${port}`);
  }
}
