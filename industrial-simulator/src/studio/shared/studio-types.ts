import type {
  DataType,
  DeviceDefinition,
  FaultDefinition,
  GeneratorDefinition,
  ParameterDefinition,
  ProtocolServerConfig,
  RegisterMapping,
  SimulatorConfig
} from '../../domain/types.js';

export interface StudioProject {
  version: 1;
  updatedAt: string;
  simulator: NonNullable<SimulatorConfig['simulator']>;
  protocols: ProtocolServerConfig[];
  devices: StudioDeviceDefinition[];
  profiles: SimulationProfile[];
  scenarios: FaultScenario[];
}

export interface StudioDeviceDefinition extends Omit<DeviceDefinition, 'parameters' | 'faults'> {
  parameters: StudioParameterDefinition[];
  faults?: FaultDefinition[];
  notes?: string;
}

export interface StudioParameterDefinition extends Omit<ParameterDefinition, 'generator' | 'mapping' | 'faults'> {
  generator: GeneratorDefinition;
  mapping: RegisterMapping;
  faults?: FaultDefinition[];
  plausibleMin?: number;
  plausibleMax?: number;
  decimalPlaces?: number;
}

export interface SimulationProfile {
  profileId: string;
  displayName: string;
  description?: string;
  deviceIds: string[];
  enabled: boolean;
}

export interface FaultScenario {
  scenarioId: string;
  displayName: string;
  description?: string;
  faults: FaultDefinition[];
  enabled: boolean;
}

export interface StudioRuntimeSnapshot {
  running: boolean;
  configPath?: string;
  stats: {
    devices: number;
    parameters: number;
    ticks: number;
    lastTickDurationMs: number;
    protocolRequests: number;
    protocolErrors: number;
  };
  values: StudioLiveValue[];
  registers: StudioRegisterRow[];
}

export interface StudioLiveValue {
  deviceId: string;
  parameterId: string;
  dataType: DataType;
  value: string;
  quality: string;
  timestamp: string;
}

export interface StudioRegisterRow {
  serverId: string;
  port: number;
  slaveId: number;
  deviceId: string;
  parameterId: string;
  registerType: string;
  address: number;
  dataType: DataType;
  value: string;
  quality: string;
}

export interface StudioApi {
  loadProject(): Promise<StudioProject>;
  saveProject(project: StudioProject): Promise<{ savedAt: string }>;
  exportConfig(project: StudioProject): Promise<{ configPath: string }>;
  startSimulator(project: StudioProject): Promise<StudioRuntimeSnapshot>;
  stopSimulator(): Promise<StudioRuntimeSnapshot>;
  getRuntimeSnapshot(project: StudioProject): Promise<StudioRuntimeSnapshot>;
}

export function createDefaultStudioProject(): StudioProject {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    simulator: {
      updateIntervalMs: 1000,
      hotReload: false,
      scriptGeneratorsEnabled: false,
      healthPort: 8088
    },
    protocols: [
      {
        id: 'modbus-main',
        type: 'modbus-tcp',
        host: '127.0.0.1',
        port: 5020,
        byteOrder: 'big-endian',
        wordOrder: 'big-endian'
      }
    ],
    devices: [
      {
        deviceId: 'main-engine-01',
        deviceType: 'engine',
        displayName: 'Main Engine 01',
        protocol: {
          type: 'modbus-tcp',
          serverId: 'modbus-main',
          slaveId: 1
        },
        parameters: [
          {
            parameterId: 'rpm',
            displayName: 'Engine RPM',
            dataType: 'float32',
            unit: 'rpm',
            plausibleMin: 0,
            plausibleMax: 1200,
            decimalPlaces: 1,
            generator: {
              type: 'linear-ramp',
              min: 500,
              max: 900,
              step: 10
            },
            mapping: {
              registerType: 'holding-register',
              address: 0
            }
          }
        ]
      }
    ],
    profiles: [
      {
        profileId: 'normal-operation',
        displayName: 'Normal Operation',
        description: 'Default operating profile for generated values.',
        deviceIds: ['main-engine-01'],
        enabled: true
      }
    ],
    scenarios: [
      {
        scenarioId: 'sensor-noise',
        displayName: 'Sensor Noise',
        description: 'Optional low-amplitude noise scenario.',
        faults: [{ type: 'noise', enabled: false, amplitude: 0.5 }],
        enabled: false
      }
    ]
  };
}

export function compileSimulatorConfig(project: StudioProject): SimulatorConfig {
  return {
    simulator: project.simulator,
    protocols: project.protocols,
    devices: project.devices.map((device) => ({
      deviceId: device.deviceId,
      deviceType: device.deviceType,
      displayName: device.displayName,
      updateIntervalMs: device.updateIntervalMs,
      protocol: device.protocol,
      faults: device.faults,
      parameters: device.parameters.map((parameter) => ({
        parameterId: parameter.parameterId,
        displayName: parameter.displayName,
        dataType: parameter.dataType,
        unit: parameter.unit,
        generator: parameter.generator,
        mapping: parameter.mapping,
        faults: parameter.faults
      }))
    }))
  };
}
