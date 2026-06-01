import type {
  DeviceDefinition,
  ParameterDefinition,
  ParameterValue,
  RegisterMapping,
  RegisterType
} from '../domain/types.js';

export interface MappingLookup {
  device: DeviceDefinition;
  parameter: ParameterDefinition;
  value: ParameterValue;
  mapping: RegisterMapping;
}

export class ParameterStore {
  private readonly values = new Map<string, ParameterValue>();
  private devices: DeviceDefinition[] = [];

  replaceDefinitions(devices: DeviceDefinition[]): void {
    this.devices = devices;
    const validKeys = new Set<string>();
    for (const device of devices) {
      for (const parameter of device.parameters) {
        validKeys.add(key(device.deviceId, parameter.parameterId));
      }
    }
    for (const existing of this.values.keys()) {
      if (!validKeys.has(existing)) {
        this.values.delete(existing);
      }
    }
  }

  setValue(value: ParameterValue): void {
    this.values.set(key(value.deviceId, value.parameterId), value);
  }

  getValue(deviceId: string, parameterId: string): ParameterValue | undefined {
    return this.values.get(key(deviceId, parameterId));
  }

  listValues(): ParameterValue[] {
    return [...this.values.values()];
  }

  findMapped(
    serverId: string,
    slaveId: number,
    registerType: RegisterType,
    address: number
  ): MappingLookup | undefined {
    for (const device of this.devices) {
      if (device.protocol.serverId !== serverId || (device.protocol.slaveId ?? 1) !== slaveId) {
        continue;
      }
      for (const parameter of device.parameters) {
        const mapping = parameter.mapping;
        if (!mapping || mapping.registerType !== registerType || mapping.address !== address) {
          continue;
        }
        const value = this.getValue(device.deviceId, parameter.parameterId);
        if (value) {
          return { device, parameter, value, mapping };
        }
      }
    }
    return undefined;
  }

  listMapped(
    serverId: string,
    slaveId: number,
    registerType: RegisterType
  ): MappingLookup[] {
    const mapped: MappingLookup[] = [];
    for (const device of this.devices) {
      if (device.protocol.serverId !== serverId || (device.protocol.slaveId ?? 1) !== slaveId) {
        continue;
      }
      for (const parameter of device.parameters) {
        const mapping = parameter.mapping;
        const value = this.getValue(device.deviceId, parameter.parameterId);
        if (mapping?.registerType === registerType && value) {
          mapped.push({ device, parameter, value, mapping });
        }
      }
    }
    return mapped.sort((a, b) => a.mapping.address - b.mapping.address);
  }
}

function key(deviceId: string, parameterId: string): string {
  return `${deviceId}:${parameterId}`;
}
