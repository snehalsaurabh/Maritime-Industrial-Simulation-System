import type { ProtocolServerConfig, SimulatorConfig } from '../../domain/types.js';
import type { ParameterStore } from '../../simulation/parameter-store.js';

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
  parameterStore: ParameterStore;
  onRequest?: () => void;
  onError?: () => void;
}
