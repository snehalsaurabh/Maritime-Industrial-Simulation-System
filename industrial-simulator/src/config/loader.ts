import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  DataType,
  RegisterType,
  SimulatorConfig
} from '../domain/types.js';

const require = createRequire(import.meta.url);
const schemaPath = resolve(process.cwd(), 'config/schemas/simulator.schema.json');

type ValidateError = { instancePath: string; message?: string };
type ValidateFunction = ((data: unknown) => boolean) & { errors?: ValidateError[] | null };
interface AjvInstance {
  compile(schema: object): ValidateFunction;
}
type AjvConstructor = new (options: { allErrors: boolean }) => AjvInstance;
type AddFormats = (ajv: AjvInstance) => void;

const ajvModule = require('ajv/dist/2020.js') as { default?: unknown };
const formatsModule = require('ajv-formats') as { default?: unknown };
const Ajv2020 = ajvModule.default as AjvConstructor;
const addFormats = formatsModule.default as AddFormats;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig(filePath: string): Promise<SimulatorConfig> {
  const absolutePath = resolve(filePath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = parseConfig(raw, absolutePath);
  await validateConfig(parsed);
  return parsed;
}

export function parseConfig(raw: string, filePath: string): SimulatorConfig {
  const extension = extname(filePath).toLowerCase();
  if (extension === '.yaml' || extension === '.yml') {
    return parseYaml(raw) as SimulatorConfig;
  }
  if (extension === '.json') {
    return JSON.parse(raw) as SimulatorConfig;
  }
  throw new ConfigError(`Unsupported configuration extension: ${extension}`);
}

export async function validateConfig(config: SimulatorConfig): Promise<void> {
  const schema = JSON.parse(await readFile(schemaPath, 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(config)) {
    const details = validate.errors
      ?.map((error) => `${error.instancePath} ${error.message}`)
      .join('; ');
    throw new ConfigError(`Configuration schema validation failed: ${details}`);
  }
  validateSemanticRules(config);
}

function validateSemanticRules(config: SimulatorConfig): void {
  const protocolIds = new Set<string>();
  for (const protocol of config.protocols) {
    if (protocolIds.has(protocol.id)) {
      throw new ConfigError(`Duplicate protocol id: ${protocol.id}`);
    }
    protocolIds.add(protocol.id);
  }

  const deviceIds = new Set<string>();
  const registerRanges = new Map<string, Array<{ start: number; end: number; parameterId: string }>>();

  for (const device of config.devices) {
    if (deviceIds.has(device.deviceId)) {
      throw new ConfigError(`Duplicate device id: ${device.deviceId}`);
    }
    deviceIds.add(device.deviceId);

    if (!protocolIds.has(device.protocol.serverId)) {
      throw new ConfigError(
        `Device ${device.deviceId} references unknown protocol server ${device.protocol.serverId}`
      );
    }

    const protocol = config.protocols.find((entry) => entry.id === device.protocol.serverId);
    const isNmeaDevice = device.protocol.type === 'nmea0183' || protocol?.type === 'nmea0183';

    const parameterIds = new Set<string>();
    for (const parameter of device.parameters) {
      if (parameterIds.has(parameter.parameterId)) {
        throw new ConfigError(
          `Duplicate parameter id ${parameter.parameterId} in device ${device.deviceId}`
        );
      }
      parameterIds.add(parameter.parameterId);

      const hasMapping = Boolean(parameter.mapping);
      const hasNmeaMapping = Boolean(parameter.nmeaMapping);
      if (hasMapping && hasNmeaMapping) {
        throw new ConfigError(
          `Parameter ${parameter.parameterId} in device ${device.deviceId} cannot have both mapping and nmeaMapping`
        );
      }
      if (isNmeaDevice) {
        if (!hasNmeaMapping) {
          throw new ConfigError(
            `NMEA device ${device.deviceId} parameter ${parameter.parameterId} requires nmeaMapping`
          );
        }
        continue;
      }
      if (!hasMapping) {
        throw new ConfigError(
          `Modbus device ${device.deviceId} parameter ${parameter.parameterId} requires mapping`
        );
      }

      if (parameter.mapping) {
        const length = parameter.mapping.length ?? registerLength(parameter.dataType, parameter.mapping.registerType);
        const slaveId = device.protocol.slaveId ?? 1;
        const key = `${device.protocol.serverId}:${slaveId}:${parameter.mapping.registerType}`;
        const ranges = registerRanges.get(key) ?? [];
        const range = {
          start: parameter.mapping.address,
          end: parameter.mapping.address + length - 1,
          parameterId: `${device.deviceId}.${parameter.parameterId}`
        };
        for (const existing of ranges) {
          if (range.start <= existing.end && range.end >= existing.start) {
            throw new ConfigError(
              `Register mapping overlap in ${key}: ${range.parameterId} overlaps ${existing.parameterId}`
            );
          }
        }
        ranges.push(range);
        registerRanges.set(key, ranges);
      }
    }
  }
}

function registerLength(dataType: DataType, registerType: RegisterType): number {
  if (registerType === 'coil' || registerType === 'discrete-input') {
    return 1;
  }
  switch (dataType) {
    case 'boolean':
    case 'int16':
    case 'uint16':
      return 1;
    case 'int32':
    case 'uint32':
    case 'float32':
      return 2;
    case 'int64':
    case 'uint64':
    case 'float64':
      return 4;
    case 'string':
      return 16;
  }
}
