import type { ProtocolPlugin, ProtocolPluginInput, ProtocolServer } from '../core/protocol-server.js';
import { NmeaTcpServer } from './nmea-tcp-server.js';

export const nmea0183Plugin: ProtocolPlugin = {
  type: 'nmea0183',
  createServers(input: ProtocolPluginInput): ProtocolServer[] {
    return input.protocolConfigs
      .filter((config) => config.type === 'nmea0183')
      .map(
        (config) =>
          new NmeaTcpServer(config, input.simulatorConfig, input.parameterRegistry, {
            onRequest: input.onRequest,
            onError: input.onError
          })
      );
  }
};
