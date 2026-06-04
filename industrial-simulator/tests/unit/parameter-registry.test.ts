import { ParameterRegistry } from '../../src/parameters/parameter-registry.js';
import type { DeviceDefinition, ParameterValue } from '../../src/domain/types.js';

describe('ParameterRegistry', () => {
  it('registers parameter definitions and latest values', () => {
    const registry = new ParameterRegistry();
    const device = deviceDefinition();
    registry.replaceDefinitions([device]);

    expect(registry.getParameter('device-1', 'rpm')?.dataType).toBe('float32');
    expect(registry.listParameters()).toHaveLength(1);

    const value: ParameterValue = {
      deviceId: 'device-1',
      parameterId: 'rpm',
      value: 850,
      dataType: 'float32',
      timestamp: new Date('2026-06-04T00:00:00.000Z'),
      quality: 'good'
    };
    registry.setValue(value);

    expect(registry.getValue('device-1', 'rpm')).toEqual(value);
    expect(registry.listValues()).toEqual([value]);
  });

  it('rejects duplicate parameters within a device', () => {
    const registry = new ParameterRegistry();
    const device = deviceDefinition();
    device.parameters.push({ ...device.parameters[0] });

    expect(() => registry.replaceDefinitions([device])).toThrow(/already registered/);
  });

  it('finds mapped values by protocol server, slave id, register type, and address', () => {
    const registry = new ParameterRegistry();
    const device = deviceDefinition();
    registry.replaceDefinitions([device]);
    registry.setValue({
      deviceId: 'device-1',
      parameterId: 'rpm',
      value: 850,
      dataType: 'float32',
      timestamp: new Date('2026-06-04T00:00:00.000Z'),
      quality: 'good'
    });

    const lookup = registry.findMapped('modbus-main', 1, 'holding-register', 0);

    expect(lookup?.device.deviceId).toBe('device-1');
    expect(lookup?.parameter.parameterId).toBe('rpm');
    expect(lookup?.mapping.address).toBe(0);
  });
});

function deviceDefinition(): DeviceDefinition {
  return {
    deviceId: 'device-1',
    protocol: { type: 'modbus-tcp', serverId: 'modbus-main', slaveId: 1 },
    parameters: [
      {
        parameterId: 'rpm',
        dataType: 'float32',
        generator: { type: 'static', value: 850 },
        mapping: { registerType: 'holding-register', address: 0 }
      }
    ]
  };
}
