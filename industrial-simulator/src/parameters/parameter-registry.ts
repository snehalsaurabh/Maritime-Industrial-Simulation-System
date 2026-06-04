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

export class ParameterRegistry {
  private readonly parameters = new Map<string, RegisteredParameter>();
  private readonly values = new Map<string, ParameterValue>();

  replaceDefinitions(devices: DeviceDefinition[]): void {
    this.parameters.clear();
    const validKeys = new Set<string>();

    for (const device of devices) {
      const parameterIds = new Set<string>();
      for (const parameter of device.parameters) {
        if (parameterIds.has(parameter.parameterId)) {
          throw new Error(
            `Parameter already registered for ${device.deviceId}: ${parameter.parameterId}`
          );
        }
        parameterIds.add(parameter.parameterId);
        const parameterKey = key(device.deviceId, parameter.parameterId);
        validKeys.add(parameterKey);
        this.parameters.set(parameterKey, { device, parameter });
      }
    }

    for (const existing of this.values.keys()) {
      if (!validKeys.has(existing)) {
        this.values.delete(existing);
      }
    }
  }

  registerParameter(device: DeviceDefinition, parameter: ParameterDefinition): void {
    const parameterKey = key(device.deviceId, parameter.parameterId);
    if (this.parameters.has(parameterKey)) {
      throw new Error(`Parameter already registered: ${device.deviceId}.${parameter.parameterId}`);
    }
    this.parameters.set(parameterKey, { device, parameter });
  }

  getParameter(deviceId: string, parameterId: string): ParameterDefinition | undefined {
    return this.parameters.get(key(deviceId, parameterId))?.parameter;
  }

  listParameters(): ParameterDefinition[] {
    return [...this.parameters.values()].map((entry) => entry.parameter);
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
    return this.listMapped(serverId, slaveId, registerType).find(
      (lookup) => lookup.mapping.address === address
    );
  }

  listMapped(serverId: string, slaveId: number, registerType: RegisterType): MappingLookup[] {
    const mapped: MappingLookup[] = [];
    for (const { device, parameter } of this.parameters.values()) {
      if (device.protocol.serverId !== serverId || (device.protocol.slaveId ?? 1) !== slaveId) {
        continue;
      }
      const mapping = parameter.mapping;
      const value = this.getValue(device.deviceId, parameter.parameterId);
      if (mapping?.registerType === registerType && value) {
        mapped.push({ device, parameter, value, mapping });
      }
    }
    return mapped.sort((a, b) => a.mapping.address - b.mapping.address);
  }
}

interface RegisteredParameter {
  device: DeviceDefinition;
  parameter: ParameterDefinition;
}

function key(deviceId: string, parameterId: string): string {
  return `${deviceId}:${parameterId}`;
}
