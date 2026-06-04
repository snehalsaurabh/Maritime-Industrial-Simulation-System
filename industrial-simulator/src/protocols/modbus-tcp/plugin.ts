import type { ProtocolPlugin, ProtocolPluginInput, ProtocolServer } from '../core/protocol-server.js';
import { ModbusTcpServer } from './modbus-tcp-server.js';

export const modbusTcpPlugin: ProtocolPlugin = {
  type: 'modbus-tcp',
  createServers(input: ProtocolPluginInput): ProtocolServer[] {
    return input.protocolConfigs
      .filter((config) => config.type === 'modbus-tcp')
      .map(
        (config) =>
          new ModbusTcpServer(config, input.parameterRegistry, {
            onRequest: input.onRequest,
            onError: input.onError
          })
      );
  }
};
