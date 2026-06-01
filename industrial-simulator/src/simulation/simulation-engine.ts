import { dirname } from 'node:path';
import type { DeviceDefinition, ParameterPrimitive } from '../domain/types.js';
import { FaultEngine } from '../faults/fault-engine.js';
import type { SimulationGenerator } from './generators.js';
import { createGenerator } from './generators.js';
import type { ParameterStore } from './parameter-store.js';

export class SimulationEngine {
  private readonly generators = new Map<string, SimulationGenerator>();
  private readonly previousValues = new Map<string, ParameterPrimitive>();
  private readonly faultEngine = new FaultEngine();
  private timer: NodeJS.Timeout | undefined;
  private tickCount = 0;
  private startedAt = Date.now();
  private lastTickDurationMs = 0;
  private devices: DeviceDefinition[] = [];

  constructor(
    private readonly parameterStore: ParameterStore,
    private readonly options: { updateIntervalMs: number; configPath: string; scriptGeneratorsEnabled: boolean }
  ) {}

  replaceDevices(devices: DeviceDefinition[]): void {
    this.devices = devices;
    this.parameterStore.replaceDefinitions(devices);
    this.generators.clear();
    const configDir = dirname(this.options.configPath);
    for (const device of devices) {
      for (const parameter of device.parameters) {
        this.generators.set(
          key(device.deviceId, parameter.parameterId),
          createGenerator(parameter.generator, {
            configDir,
            scriptGeneratorsEnabled: this.options.scriptGeneratorsEnabled
          })
        );
      }
    }
    this.tick();
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.tick(), this.options.updateIntervalMs);
    this.timer.unref();
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  tick(): void {
    const started = Date.now();
    this.tickCount += 1;
    const now = new Date();
    const elapsedSeconds = (started - this.startedAt) / 1000;

    for (const device of this.devices) {
      for (const parameter of device.parameters) {
        const id = key(device.deviceId, parameter.parameterId);
        const generator = this.generators.get(id);
        if (!generator) {
          continue;
        }
        const baseValue = generator.next({
          now,
          tick: this.tickCount,
          elapsedSeconds,
          previousValue: this.previousValues.get(id)
        });
        const value = this.faultEngine.apply(
          id,
          baseValue,
          {
            deviceId: device.deviceId,
            parameterId: parameter.parameterId,
            dataType: parameter.dataType,
            timestamp: now
          },
          [...(device.faults ?? []), ...(parameter.faults ?? [])]
        );
        this.previousValues.set(id, value.value);
        this.parameterStore.setValue(value);
      }
    }

    this.lastTickDurationMs = Date.now() - started;
  }

  getStats(): { ticks: number; lastTickDurationMs: number } {
    return {
      ticks: this.tickCount,
      lastTickDurationMs: this.lastTickDurationMs
    };
  }
}

function key(deviceId: string, parameterId: string): string {
  return `${deviceId}:${parameterId}`;
}
