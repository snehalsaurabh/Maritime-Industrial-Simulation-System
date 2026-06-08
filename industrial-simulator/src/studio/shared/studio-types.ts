import type {
  DataType,
  DeviceDefinition,
  FaultDefinition,
  GeneratorDefinition,
  NmeaFieldMapping,
  ParameterDefinition,
  ProtocolServerConfig,
  RegisterMapping,
  SimulatorConfig
} from '../../domain/types.js';
import { createNmeaParameters } from './nmea-templates.js';

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

export interface StudioParameterDefinition extends Omit<ParameterDefinition, 'generator' | 'mapping' | 'nmeaMapping' | 'faults'> {
  generator: GeneratorDefinition;
  mapping?: RegisterMapping;
  nmeaMapping?: NmeaFieldMapping;
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
  sentences: StudioSentenceRow[];
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

export interface StudioSentenceRow {
  deviceId: string;
  sentenceType: string;
  line: string;
  timestamp: string;
}

export interface StudioApi {
  loadProject(): Promise<StudioProject>;
  saveProject(project: StudioProject): Promise<{ savedAt: string }>;
  exportConfig(project: StudioProject): Promise<{ configPath: string }>;
  startSimulator(project: StudioProject): Promise<StudioRuntimeSnapshot>;
  stopSimulator(): Promise<StudioRuntimeSnapshot>;
  getRuntimeSnapshot(project: StudioProject): Promise<StudioRuntimeSnapshot>;
}

export function protocolById(protocols: ProtocolServerConfig[], serverId: string): ProtocolServerConfig | undefined {
  return protocols.find((protocol) => protocol.id === serverId);
}

export function isNmeaDevice(device: StudioDeviceDefinition, protocols: ProtocolServerConfig[]): boolean {
  if (device.protocol.type === 'nmea0183') {
    return true;
  }
  const protocol = protocolById(protocols, device.protocol.serverId);
  return protocol?.type === 'nmea0183';
}

export function createModbusParameter(parameterId: string, address: number): StudioParameterDefinition {
  return {
    parameterId,
    displayName: parameterId.replaceAll('-', ' '),
    dataType: 'float32',
    unit: '',
    plausibleMin: 0,
    plausibleMax: 100,
    generator: { type: 'random', min: 0, max: 100 },
    mapping: { registerType: 'holding-register', address }
  };
}

export function createNmeaDevice(
  deviceId: string,
  displayName: string,
  serverId: string,
  talkerId = 'GP'
): StudioDeviceDefinition {
  return {
    deviceId,
    deviceType: 'gps',
    displayName,
    notes: 'NMEA 0183 GPS receiver with fixed GGA, RMC, and GSV sentence parameters.',
    protocol: {
      type: 'nmea0183',
      serverId,
      talkerId
    },
    parameters: createNmeaParameters()
  };
}

export function applyProtocolServerChange(
  device: StudioDeviceDefinition,
  serverId: string,
  protocols: ProtocolServerConfig[]
): void {
  const protocol = protocolById(protocols, serverId);
  if (!protocol) {
    return;
  }

  device.protocol.serverId = serverId;
  device.protocol.type = protocol.type;

  if (protocol.type === 'nmea0183') {
    device.protocol.slaveId = undefined;
    device.protocol.talkerId = device.protocol.talkerId ?? protocol.talkerId ?? 'GP';
    device.deviceType = device.deviceType === 'generic-device' ? 'gps' : device.deviceType;
    device.parameters = createNmeaParameters();
    return;
  }

  device.protocol.talkerId = undefined;
  device.protocol.slaveId = device.protocol.slaveId ?? 1;
  if (device.parameters.every((parameter) => parameter.nmeaMapping)) {
    device.parameters = [createModbusParameter('value', 0)];
  }
}

export function ensureStudioProtocols(protocols: ProtocolServerConfig[]): ProtocolServerConfig[] {
  const next = [...protocols];
  if (!next.some((protocol) => protocol.id === 'modbus-main')) {
    next.unshift({
      id: 'modbus-main',
      type: 'modbus-tcp',
      host: '127.0.0.1',
      port: 5020,
      byteOrder: 'big-endian',
      wordOrder: 'big-endian'
    });
  }
  if (!next.some((protocol) => protocol.id === 'nmea-gps')) {
    next.push({
      id: 'nmea-gps',
      type: 'nmea0183',
      host: '127.0.0.1',
      port: 10110,
      talkerId: 'GP',
      sentenceIntervalMs: 1000
    });
  }
  return next;
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
    protocols: ensureStudioProtocols([]),
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

export function normalizeStudioProject(project: StudioProject): StudioProject {
  return {
    ...project,
    protocols: ensureStudioProtocols(project.protocols)
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
        nmeaMapping: parameter.nmeaMapping,
        faults: parameter.faults
      }))
    }))
  };
}
