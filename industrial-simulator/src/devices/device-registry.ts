import type { DeviceDefinition } from '../domain/types.js';

export class DeviceRegistry {
  private readonly devices = new Map<string, DeviceDefinition>();

  registerDevice(device: DeviceDefinition): void {
    if (this.devices.has(device.deviceId)) {
      throw new Error(`Device already registered: ${device.deviceId}`);
    }
    this.devices.set(device.deviceId, device);
  }

  removeDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  getDevice(deviceId: string): DeviceDefinition | undefined {
    return this.devices.get(deviceId);
  }

  listDevices(): DeviceDefinition[] {
    return [...this.devices.values()];
  }

  replaceAll(devices: DeviceDefinition[]): void {
    this.devices.clear();
    for (const device of devices) {
      this.registerDevice(device);
    }
  }
}
