export type DataType =
  | 'int16'
  | 'uint16'
  | 'int32'
  | 'uint32'
  | 'int64'
  | 'uint64'
  | 'float32'
  | 'float64'
  | 'boolean'
  | 'string';

export type RegisterType =
  | 'holding-register'
  | 'input-register'
  | 'coil'
  | 'discrete-input';

export type ProtocolType = 'modbus-tcp' | 'nmea0183' | string;

export type NmeaSentenceType = 'GGA' | 'RMC' | 'GSV';

export interface NmeaFieldMapping {
  sentence: NmeaSentenceType;
  fieldKey: string;
  satelliteSlot?: number;
}

export type ParameterPrimitive = number | boolean | string | bigint;

export interface SimulatorConfig {
  simulator?: {
    updateIntervalMs?: number;
    hotReload?: boolean;
    scriptGeneratorsEnabled?: boolean;
    healthPort?: number;
  };
  protocols: ProtocolServerConfig[];
  devices: DeviceDefinition[];
}

export interface ProtocolServerConfig {
  id: string;
  type: ProtocolType;
  host?: string;
  port?: number;
  byteOrder?: 'big-endian' | 'little-endian';
  wordOrder?: 'big-endian' | 'little-endian';
  talkerId?: string;
  sentenceIntervalMs?: number;
}

export interface DeviceDefinition {
  deviceId: string;
  deviceType?: string;
  displayName?: string;
  updateIntervalMs?: number;
  protocol: DeviceProtocolBinding;
  parameters: ParameterDefinition[];
  faults?: FaultDefinition[];
}

export interface DeviceProtocolBinding {
  type: ProtocolType;
  serverId: string;
  slaveId?: number;
  talkerId?: string;
}

export interface ParameterDefinition {
  parameterId: string;
  displayName?: string;
  dataType: DataType;
  unit?: string;
  generator: GeneratorDefinition;
  mapping?: RegisterMapping;
  nmeaMapping?: NmeaFieldMapping;
  faults?: FaultDefinition[];
}

export interface RegisterMapping {
  registerType: RegisterType;
  address: number;
  length?: number;
}

export type GeneratorDefinition =
  | StaticGeneratorDefinition
  | RandomGeneratorDefinition
  | LinearRampGeneratorDefinition
  | SineWaveGeneratorDefinition
  | SawtoothGeneratorDefinition
  | SquareWaveGeneratorDefinition
  | ReplayGeneratorDefinition
  | ScriptGeneratorDefinition;

export interface StaticGeneratorDefinition {
  type: 'static';
  value: ParameterPrimitive;
}

export interface RandomGeneratorDefinition {
  type: 'random';
  min: number;
  max: number;
}

export interface LinearRampGeneratorDefinition {
  type: 'linear-ramp';
  min: number;
  max: number;
  step: number;
}

export interface SineWaveGeneratorDefinition {
  type: 'sine-wave';
  amplitude: number;
  offset: number;
  periodSeconds: number;
}

export interface SawtoothGeneratorDefinition {
  type: 'sawtooth';
  min?: number;
  max?: number;
  periodSeconds?: number;
}

export interface SquareWaveGeneratorDefinition {
  type: 'square-wave';
  low?: number;
  high?: number;
  periodSeconds?: number;
}

export interface ReplayGeneratorDefinition {
  type: 'replay';
  sourceFile: string;
  parameterColumn?: string;
  timestampColumn?: string;
  loop?: boolean;
}

export interface ScriptGeneratorDefinition {
  type: 'script';
  script: string;
  initialValue?: number;
}

export type FaultDefinition =
  | { type: 'freeze'; enabled?: boolean }
  | { type: 'timeout'; enabled?: boolean }
  | { type: 'drift'; enabled?: boolean; ratePerTick?: number }
  | { type: 'spike'; enabled?: boolean; value?: number; probability?: number }
  | { type: 'noise'; enabled?: boolean; amplitude?: number }
  | { type: 'offline'; enabled?: boolean };

export interface ParameterValue {
  deviceId: string;
  parameterId: string;
  value: ParameterPrimitive;
  dataType: DataType;
  timestamp: Date;
  quality: 'good' | 'frozen' | 'faulted' | 'timeout' | 'offline';
}

export interface RuntimeStats {
  devices: number;
  parameters: number;
  ticks: number;
  lastTickDurationMs: number;
  protocolRequests: number;
  protocolErrors: number;
}
