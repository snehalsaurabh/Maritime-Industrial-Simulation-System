import { createNmeaParameters } from '../../src/studio/shared/nmea-templates.js';
import type { DeviceDefinition } from '../../src/domain/types.js';
import { ParameterRegistry } from '../../src/parameters/parameter-registry.js';
import { buildDeviceSentences } from '../../src/protocols/nmea0183/sentence-builder.js';
import {
  formatLatitude,
  formatLongitude,
  nmeaChecksum,
  wrapSentence
} from '../../src/protocols/nmea0183/nmea-formatters.js';

function createGpsDevice(): DeviceDefinition {
  return {
    deviceId: 'gps-01',
    deviceType: 'gps',
    displayName: 'GPS Receiver',
    protocol: {
      type: 'nmea0183',
      serverId: 'nmea-gps',
      talkerId: 'GP'
    },
    parameters: createNmeaParameters()
  };
}

function seedRegistry(device: DeviceDefinition): ParameterRegistry {
  const registry = new ParameterRegistry();
  registry.replaceDefinitions([device]);
  for (const parameter of device.parameters) {
    const generator = parameter.generator;
    const value =
      generator.type === 'static'
        ? generator.value
        : generator.type === 'linear-ramp'
          ? generator.min
          : 0;
    registry.setValue({
      deviceId: device.deviceId,
      parameterId: parameter.parameterId,
      value,
      dataType: parameter.dataType,
      timestamp: new Date('2026-06-08T21:02:30Z'),
      quality: 'good'
    });
  }
  return registry;
}

describe('nmea formatters', () => {
  it('formats latitude and longitude from decimal degrees', () => {
    expect(formatLatitude(38.924145)).toEqual({ coordinate: '3855.4487', hemisphere: 'N' });
    expect(formatLongitude(-94.766785)).toEqual({ coordinate: '09446.0071', hemisphere: 'W' });
  });

  it('computes checksum for sample GGA sentence body', () => {
    const body = 'GPGGA,210230,3855.4487,N,09446.0071,W,1,07,1.1,370.5,M,-29.5,M,,';
    expect(nmeaChecksum(body)).toBe('7A');
    expect(wrapSentence('GP', 'GGA', body.split(',').slice(1))).toBe(
      '$GPGGA,210230,3855.4487,N,09446.0071,W,1,07,1.1,370.5,M,-29.5,M,,*7A'
    );
  });
});

describe('nmea sentence builder', () => {
  it('builds GGA and RMC sentences from device parameters', () => {
    const device = createGpsDevice();
    const registry = seedRegistry(device);
    const sentences = buildDeviceSentences(device, registry, 'GP');

    const gga = sentences.find((entry) => entry.sentenceType === 'GGA');
    const rmc = sentences.find((entry) => entry.sentenceType === 'RMC');
    expect(gga?.line).toBe('$GPGGA,210230,3855.4487,N,09446.0071,W,1,07,1.1,370.5,M,-29.5,M,,*7A');
    expect(rmc?.line).toMatch(/^\$GPRMC,210230,A,3855\.4487,N,09446\.0071,W,/);
  });

  it('splits GSV satellites into multiple messages and omits zero-snr as empty field', () => {
    const device = createGpsDevice();
    const registry = seedRegistry(device);
    const gsvLines = buildDeviceSentences(device, registry, 'GP')
      .filter((entry) => entry.sentenceType === 'GSV')
      .map((entry) => entry.line);

    expect(gsvLines).toHaveLength(2);
    expect(gsvLines[0]).toMatch(/^\$GPGSV,2,1,08,/);
    expect(gsvLines[1]).toMatch(/^\$GPGSV,2,2,08,/);
    expect(gsvLines[1]).toContain(',19,09,158,,');
  });
});
