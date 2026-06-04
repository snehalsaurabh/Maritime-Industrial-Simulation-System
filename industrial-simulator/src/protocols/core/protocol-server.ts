import type { ProtocolServerConfig, SimulatorConfig } from '../../domain/types.js';
import type { ParameterRegistry } from '../../parameters/parameter-registry.js';

export interface ProtocolServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface ProtocolPlugin {
  type: string;
  createServers(input: ProtocolPluginInput): ProtocolServer[];
}

export interface ProtocolPluginInput {
  simulatorConfig: SimulatorConfig;
  protocolConfigs: ProtocolServerConfig[];
  parameterRegistry: ParameterRegistry;
  onRequest?: () => void;
  onError?: () => void;
}
