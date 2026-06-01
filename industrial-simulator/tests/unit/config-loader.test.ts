import { validateConfig } from '../../src/config/loader.js';
import type { SimulatorConfig } from '../../src/domain/types.js';

describe('configuration validation', () => {
  it('rejects overlapping mappings for the same slave and register type', async () => {
    const config: SimulatorConfig = {
      protocols: [{ id: 'modbus-main', type: 'modbus-tcp', port: 5020 }],
      devices: [
        {
          deviceId: 'device-1',
          protocol: { type: 'modbus-tcp', serverId: 'modbus-main', slaveId: 1 },
          parameters: [
            {
              parameterId: 'a',
              dataType: 'float32',
              generator: { type: 'static', value: 1 },
              mapping: { registerType: 'holding-register', address: 0 }
            },
            {
              parameterId: 'b',
              dataType: 'uint16',
              generator: { type: 'static', value: 2 },
              mapping: { registerType: 'holding-register', address: 1 }
            }
          ]
        }
      ]
    };

    await expect(validateConfig(config)).rejects.toThrow(/overlap/);
  });
});
