import type { DeviceDefinition, NmeaSentenceType, ParameterPrimitive } from '../../domain/types.js';
import type { ParameterRegistry } from '../../parameters/parameter-registry.js';
import {
  formatAzimuth,
  formatInteger,
  formatLatitude,
  formatLongitude,
  formatNumeric,
  wrapSentence
} from './nmea-formatters.js';

export interface NmeaSentenceSnapshot {
  deviceId: string;
  sentenceType: NmeaSentenceType;
  line: string;
  timestamp: string;
}

interface SatelliteSlot {
  prn: number;
  elevation: number;
  azimuth: number;
  snr: number;
}

export function buildDeviceSentences(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  talkerId: string,
  timestamp = new Date()
): NmeaSentenceSnapshot[] {
  const iso = timestamp.toISOString();
  const lines: NmeaSentenceSnapshot[] = [];
  for (const sentenceType of [
    'GGA',
    'RMC',
    'GSV',
    'VTG',
    'VHW',
    'MWV',
    'HDT',
    'DBT',
    'RSA'
  ] as const) {
    const built = buildSentence(device, registry, talkerId, sentenceType);
    if (Array.isArray(built)) {
      for (const line of built) {
        lines.push({ deviceId: device.deviceId, sentenceType, line, timestamp: iso });
      }
    } else if (built) {
      lines.push({ deviceId: device.deviceId, sentenceType, line: built, timestamp: iso });
    }
  }
  return lines;
}

function buildSentence(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  talkerId: string,
  sentenceType: NmeaSentenceType
): string | string[] | undefined {
  switch (sentenceType) {
    case 'GGA':
      return buildGga(device, registry, talkerId);
    case 'RMC':
      return buildRmc(device, registry, talkerId);
    case 'GSV':
      return buildGsv(device, registry, talkerId);
    case 'VTG':
      return buildVtg(device, registry, talkerId);
    case 'VHW':
      return buildVhw(device, registry, talkerId);
    case 'MWV':
      return buildMwv(device, registry, talkerId);
    case 'HDT':
      return buildHdt(device, registry, talkerId);
    case 'RSA':
      return buildRsa(device, registry, talkerId);
    case 'DBT':
      return buildDbt(device, registry, talkerId);
  }
}

function buildGga(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const latitude = numberField(device, registry, 'GGA', 'latitude', 0);
  const longitude = numberField(device, registry, 'GGA', 'longitude', 0);
  const latHem = stringField(
    device,
    registry,
    'GGA',
    'latitudeHemisphere',
    latitude >= 0 ? 'N' : 'S'
  );
  const lonHem = stringField(
    device,
    registry,
    'GGA',
    'longitudeHemisphere',
    longitude >= 0 ? 'E' : 'W'
  );
  const lat = formatLatitude(latitude);
  const lon = formatLongitude(longitude);

  return wrapSentence(talkerId, 'GGA', [
    stringField(device, registry, 'GGA', 'utcTime', '000000'),
    lat.coordinate,
    latHem || lat.hemisphere,
    lon.coordinate,
    lonHem || lon.hemisphere,
    formatInteger(numberField(device, registry, 'GGA', 'fixQuality', 0)),
    formatInteger(numberField(device, registry, 'GGA', 'satellitesUsed', 0), 2),
    formatNumeric(numberField(device, registry, 'GGA', 'hdop', 0), 1),
    formatNumeric(numberField(device, registry, 'GGA', 'altitude', 0), 1),
    'M',
    formatNumeric(numberField(device, registry, 'GGA', 'geoidSeparation', 0), 1),
    'M',
    stringField(device, registry, 'GGA', 'dgpsAge', ''),
    stringField(device, registry, 'GGA', 'dgpsStationId', '')
  ]);
}

function buildRmc(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const latitude = numberField(device, registry, 'RMC', 'latitude', 0);
  const longitude = numberField(device, registry, 'RMC', 'longitude', 0);
  const latHem = stringField(
    device,
    registry,
    'RMC',
    'latitudeHemisphere',
    latitude >= 0 ? 'N' : 'S'
  );
  const lonHem = stringField(
    device,
    registry,
    'RMC',
    'longitudeHemisphere',
    longitude >= 0 ? 'E' : 'W'
  );
  const lat = formatLatitude(latitude);
  const lon = formatLongitude(longitude);

  return wrapSentence(talkerId, 'RMC', [
    stringField(device, registry, 'RMC', 'utcTime', '000000'),
    stringField(device, registry, 'RMC', 'status', 'A'),
    lat.coordinate,
    latHem || lat.hemisphere,
    lon.coordinate,
    lonHem || lon.hemisphere,
    formatNumeric(numberField(device, registry, 'RMC', 'speedKnots', 0), 1),
    formatNumeric(numberField(device, registry, 'RMC', 'courseOverGround', 0), 1),
    stringField(device, registry, 'RMC', 'date', '010100'),
    formatNumeric(numberField(device, registry, 'RMC', 'magneticVariation', 0), 1),
    stringField(device, registry, 'RMC', 'magneticVariationHemisphere', '')
  ]);
}

function buildGsv(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  talkerId: string
): string[] {
  const satellites = collectSatellites(device, registry);
  const totalSatellites = Math.max(
    satellites.length,
    Math.round(numberField(device, registry, 'GSV', 'totalSatellitesInView', satellites.length))
  );
  if (satellites.length === 0) {
    return [wrapSentence(talkerId, 'GSV', ['1', '1', formatInteger(totalSatellites, 2)])];
  }

  const chunks = chunkSatellites(satellites, 4);
  const totalMessages = chunks.length;
  return chunks.map((chunk, index) =>
    wrapSentence(talkerId, 'GSV', [
      formatInteger(totalMessages),
      formatInteger(index + 1),
      formatInteger(totalSatellites, 2),
      ...chunk.flatMap((satellite) => [
        formatInteger(satellite.prn, 2),
        formatInteger(satellite.elevation, 2),
        formatAzimuth(satellite.azimuth),
        satellite.snr > 0 ? formatInteger(satellite.snr, 2) : ''
      ])
    ])
  );
}

function buildVtg(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const courseOverGround = stringField(device, registry, 'VTG', 'courseOverGround', '');

  const courseOverGroundReference = stringField(
    device,
    registry,
    'VTG',
    'courseOverGroundReference',
    'T'
  );

  const courseOverGroundMagnetic = stringField(
    device,
    registry,
    'VTG',
    'courseOverGroundMagnetic',
    ''
  );

  const courseOverGroundMagneticReference = stringField(
    device,
    registry,
    'VTG',
    'courseOverGroundMagneticReference',
    'M'
  );

  const speedOverGroundKnots = stringField(device, registry, 'VTG', 'speedOverGroundKnots', '');

  const speedOverGroundKnotsUnit = stringField(
    device,
    registry,
    'VTG',
    'speedOverGroundKnotsUnit',
    'N'
  );

  const speedOverGroundKmh = stringField(device, registry, 'VTG', 'speedOverGroundKmh', '');

  const speedOverGroundKmhUnit = stringField(
    device,
    registry,
    'VTG',
    'speedOverGroundKmhUnit',
    'K'
  );

  return wrapSentence(talkerId, 'VTG', [
    courseOverGround,
    courseOverGroundReference,
    courseOverGroundMagnetic,
    courseOverGroundMagneticReference,
    speedOverGroundKnots,
    speedOverGroundKnotsUnit,
    speedOverGroundKmh,
    speedOverGroundKmhUnit
  ]);
}

function buildVhw(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const headingTrue = stringField(device, registry, 'VHW', 'headingTrue', '');

  const headingTrueReference = stringField(device, registry, 'VHW', 'headingTrueReference', 'T');

  const headingMagnetic = stringField(device, registry, 'VHW', 'headingMagnetic', '');

  const headingMagneticReference = stringField(
    device,
    registry,
    'VHW',
    'headingMagneticReference',
    'M'
  );

  const speedThroughWaterKnots = stringField(device, registry, 'VHW', 'speedThroughWaterKnots', '');

  const speedThroughWaterKnotsUnit = stringField(
    device,
    registry,
    'VHW',
    'speedThroughWaterKnotsUnit',
    'N'
  );

  const speedThroughWaterKmh = stringField(device, registry, 'VHW', 'speedThroughWaterKmh', '');

  const speedThroughWaterKmhUnit = stringField(
    device,
    registry,
    'VHW',
    'speedThroughWaterKmhUnit',
    'K'
  );

  return wrapSentence(talkerId, 'VHW', [
    headingTrue,
    headingTrueReference,
    headingMagnetic,
    headingMagneticReference,
    speedThroughWaterKnots,
    speedThroughWaterKnotsUnit,
    speedThroughWaterKmh,
    speedThroughWaterKmhUnit
  ]);
}

function buildMwv(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const windDirection = stringField(device, registry, 'MWV', 'windDirection', '');

  const windDirectionReference = stringField(
    device,
    registry,
    'MWV',
    'windDirectionReference',
    'T'
  );

  const windSpeed = stringField(device, registry, 'MWV', 'windSpeed', '');

  const windSpeedUnit = stringField(device, registry, 'MWV', 'windSpeedUnit', 'N');

  const dataStatus = stringField(device, registry, 'MWV', 'dataStatus', 'A');

  return wrapSentence(talkerId, 'MWV', [
    windDirection,
    windDirectionReference,
    windSpeed,
    windSpeedUnit,
    dataStatus
  ]);
}

function buildHdt(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const headingTrue = stringField(device, registry, 'HDT', 'headingTrue', '');

  const headingReference = stringField(device, registry, 'HDT', 'headingReference', 'T');

  return wrapSentence(talkerId, 'HDT', [headingTrue, headingReference]);
}

function buildDbt(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const depthFeet = stringField(device, registry, 'DBT', 'depthFeet', '');

  const depthFeetUnit = stringField(device, registry, 'DBT', 'depthFeetUnit', 'f');

  const depthMeters = stringField(device, registry, 'DBT', 'depthMeters', '');

  const depthMetersUnit = stringField(device, registry, 'DBT', 'depthMetersUnit', 'M');

  const depthFathoms = stringField(device, registry, 'DBT', 'depthFathoms', '');
  const depthFathomsUnit = stringField(device, registry, 'DBT', 'depthFathomsUnit', 'F');

  return wrapSentence(talkerId, 'DBT', [
    depthFeet,
    depthFeetUnit,
    depthMeters,
    depthMetersUnit,
    depthFathoms,
    depthFathomsUnit
  ]);
}

function buildRsa(device: DeviceDefinition, registry: ParameterRegistry, talkerId: string): string {
  const starboardRudderAngle = stringField(device, registry, 'RSA', 'starboardRudderAngle', '');

  const starboardRudderStatus = stringField(device, registry, 'RSA', 'starboardRudderStatus', 'A');

  const portRudderAngle = stringField(device, registry, 'RSA', 'portRudderAngle', '');

  const portRudderStatus = stringField(device, registry, 'RSA', 'portRudderStatus', 'A');

  return wrapSentence(talkerId, 'RSA', [
    starboardRudderAngle,
    starboardRudderStatus,
    portRudderAngle,
    portRudderStatus
  ]);
}

function collectSatellites(device: DeviceDefinition, registry: ParameterRegistry): SatelliteSlot[] {
  const slots: SatelliteSlot[] = [];
  for (let slot = 1; slot <= 8; slot += 1) {
    const prn = numberField(device, registry, 'GSV', 'prn', 0, slot);
    if (prn <= 0) {
      continue;
    }
    slots.push({
      prn,
      elevation: numberField(device, registry, 'GSV', 'elevation', 0, slot),
      azimuth: numberField(device, registry, 'GSV', 'azimuth', 0, slot),
      snr: numberField(device, registry, 'GSV', 'snr', 0, slot)
    });
  }
  return slots;
}

function chunkSatellites(satellites: SatelliteSlot[], size: number): SatelliteSlot[][] {
  const chunks: SatelliteSlot[][] = [];
  for (let index = 0; index < satellites.length; index += size) {
    chunks.push(satellites.slice(index, index + size));
  }
  return chunks;
}

function stringField(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  sentence: NmeaSentenceType,
  fieldKey: string,
  fallback: string,
  satelliteSlot?: number
): string {
  const value = readField(device, registry, sentence, fieldKey, satelliteSlot);
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
}

function numberField(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  sentence: NmeaSentenceType,
  fieldKey: string,
  fallback: number,
  satelliteSlot?: number
): number {
  const value = readField(device, registry, sentence, fieldKey, satelliteSlot);
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function readField(
  device: DeviceDefinition,
  registry: ParameterRegistry,
  sentence: NmeaSentenceType,
  fieldKey: string,
  satelliteSlot?: number
): ParameterPrimitive | undefined {
  const parameter = device.parameters.find(
    (entry) =>
      entry.nmeaMapping?.sentence === sentence &&
      entry.nmeaMapping.fieldKey === fieldKey &&
      (satelliteSlot === undefined || entry.nmeaMapping.satelliteSlot === satelliteSlot)
  );
  if (!parameter) {
    return undefined;
  }
  return registry.getValue(device.deviceId, parameter.parameterId)?.value;
}
