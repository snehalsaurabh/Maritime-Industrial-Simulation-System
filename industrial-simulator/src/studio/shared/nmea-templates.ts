import type { DataType, GeneratorDefinition, NmeaFieldMapping } from '../../domain/types.js';

export interface NmeaTemplateParameter {
  parameterId: string;
  displayName: string;
  dataType: DataType;
  unit?: string;
  plausibleMin?: number;
  plausibleMax?: number;
  decimalPlaces?: number;
  generator: GeneratorDefinition;
  nmeaMapping: NmeaFieldMapping;
}

interface NmeaFieldSpec {
  parameterId: string;
  displayName: string;
  fieldKey: string;
  sentence: 'GGA' | 'RMC' | 'GSV';
  dataType: DataType;
  unit?: string;
  plausibleMin?: number;
  plausibleMax?: number;
  decimalPlaces?: number;
  generator: GeneratorDefinition;
  satelliteSlot?: number;
}

const GGA_FIELDS: NmeaFieldSpec[] = [
  { parameterId: 'gga.utcTime', displayName: 'UTC Time', fieldKey: 'utcTime', sentence: 'GGA', dataType: 'string', generator: { type: 'static', value: '210230' } },
  { parameterId: 'gga.latitude', displayName: 'Latitude', fieldKey: 'latitude', sentence: 'GGA', dataType: 'float64', unit: 'deg', plausibleMin: -90, plausibleMax: 90, decimalPlaces: 6, generator: { type: 'static', value: 38.924145 } },
  { parameterId: 'gga.latitudeHemisphere', displayName: 'Latitude Hemisphere', fieldKey: 'latitudeHemisphere', sentence: 'GGA', dataType: 'string', generator: { type: 'static', value: 'N' } },
  { parameterId: 'gga.longitude', displayName: 'Longitude', fieldKey: 'longitude', sentence: 'GGA', dataType: 'float64', unit: 'deg', plausibleMin: -180, plausibleMax: 180, decimalPlaces: 6, generator: { type: 'static', value: -94.766785 } },
  { parameterId: 'gga.longitudeHemisphere', displayName: 'Longitude Hemisphere', fieldKey: 'longitudeHemisphere', sentence: 'GGA', dataType: 'string', generator: { type: 'static', value: 'W' } },
  { parameterId: 'gga.fixQuality', displayName: 'Fix Quality', fieldKey: 'fixQuality', sentence: 'GGA', dataType: 'uint16', plausibleMin: 0, plausibleMax: 5, generator: { type: 'static', value: 1 } },
  { parameterId: 'gga.satellitesUsed', displayName: 'Satellites Used', fieldKey: 'satellitesUsed', sentence: 'GGA', dataType: 'uint16', plausibleMin: 0, plausibleMax: 32, generator: { type: 'static', value: 7 } },
  { parameterId: 'gga.hdop', displayName: 'HDOP', fieldKey: 'hdop', sentence: 'GGA', dataType: 'float32', plausibleMin: 0, plausibleMax: 20, decimalPlaces: 1, generator: { type: 'static', value: 1.1 } },
  { parameterId: 'gga.altitude', displayName: 'Altitude', fieldKey: 'altitude', sentence: 'GGA', dataType: 'float32', unit: 'm', plausibleMin: -500, plausibleMax: 10000, decimalPlaces: 1, generator: { type: 'static', value: 370.5 } },
  { parameterId: 'gga.geoidSeparation', displayName: 'Geoid Separation', fieldKey: 'geoidSeparation', sentence: 'GGA', dataType: 'float32', unit: 'm', plausibleMin: -200, plausibleMax: 200, decimalPlaces: 1, generator: { type: 'static', value: -29.5 } },
  { parameterId: 'gga.dgpsAge', displayName: 'DGPS Age', fieldKey: 'dgpsAge', sentence: 'GGA', dataType: 'string', generator: { type: 'static', value: '' } },
  { parameterId: 'gga.dgpsStationId', displayName: 'DGPS Station ID', fieldKey: 'dgpsStationId', sentence: 'GGA', dataType: 'string', generator: { type: 'static', value: '' } }
];

const RMC_FIELDS: NmeaFieldSpec[] = [
  { parameterId: 'rmc.utcTime', displayName: 'UTC Time', fieldKey: 'utcTime', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: '210230' } },
  { parameterId: 'rmc.status', displayName: 'Status', fieldKey: 'status', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: 'A' } },
  { parameterId: 'rmc.latitude', displayName: 'Latitude', fieldKey: 'latitude', sentence: 'RMC', dataType: 'float64', unit: 'deg', plausibleMin: -90, plausibleMax: 90, decimalPlaces: 6, generator: { type: 'static', value: 38.924145 } },
  { parameterId: 'rmc.latitudeHemisphere', displayName: 'Latitude Hemisphere', fieldKey: 'latitudeHemisphere', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: 'N' } },
  { parameterId: 'rmc.longitude', displayName: 'Longitude', fieldKey: 'longitude', sentence: 'RMC', dataType: 'float64', unit: 'deg', plausibleMin: -180, plausibleMax: 180, decimalPlaces: 6, generator: { type: 'static', value: -94.766785 } },
  { parameterId: 'rmc.longitudeHemisphere', displayName: 'Longitude Hemisphere', fieldKey: 'longitudeHemisphere', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: 'W' } },
  { parameterId: 'rmc.speedKnots', displayName: 'Speed (knots)', fieldKey: 'speedKnots', sentence: 'RMC', dataType: 'float32', unit: 'kn', plausibleMin: 0, plausibleMax: 100, decimalPlaces: 1, generator: { type: 'linear-ramp', min: 0, max: 15, step: 0.5 } },
  { parameterId: 'rmc.courseOverGround', displayName: 'Course Over Ground', fieldKey: 'courseOverGround', sentence: 'RMC', dataType: 'float32', unit: 'deg', plausibleMin: 0, plausibleMax: 360, decimalPlaces: 1, generator: { type: 'static', value: 76.2 } },
  { parameterId: 'rmc.date', displayName: 'Date', fieldKey: 'date', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: '130495' } },
  { parameterId: 'rmc.magneticVariation', displayName: 'Magnetic Variation', fieldKey: 'magneticVariation', sentence: 'RMC', dataType: 'float32', unit: 'deg', plausibleMin: 0, plausibleMax: 30, decimalPlaces: 1, generator: { type: 'static', value: 3.8 } },
  { parameterId: 'rmc.magneticVariationHemisphere', displayName: 'Mag Var Hemisphere', fieldKey: 'magneticVariationHemisphere', sentence: 'RMC', dataType: 'string', generator: { type: 'static', value: 'E' } }
];

const GSV_SATELLITE_DEFAULTS = [
  { prn: 2, elevation: 74, azimuth: 42, snr: 45 },
  { prn: 4, elevation: 18, azimuth: 190, snr: 36 },
  { prn: 7, elevation: 67, azimuth: 279, snr: 42 },
  { prn: 12, elevation: 29, azimuth: 323, snr: 36 },
  { prn: 15, elevation: 30, azimuth: 50, snr: 47 },
  { prn: 19, elevation: 9, azimuth: 158, snr: 0 },
  { prn: 26, elevation: 12, azimuth: 281, snr: 40 },
  { prn: 27, elevation: 38, azimuth: 173, snr: 41 }
];

function gsvFields(): NmeaFieldSpec[] {
  const fields: NmeaFieldSpec[] = [
    {
      parameterId: 'gsv.totalSatellitesInView',
      displayName: 'Total Satellites In View',
      fieldKey: 'totalSatellitesInView',
      sentence: 'GSV',
      dataType: 'uint16',
      plausibleMin: 0,
      plausibleMax: 32,
      generator: { type: 'static', value: 8 }
    }
  ];

  for (let slot = 1; slot <= 8; slot += 1) {
    const defaults = GSV_SATELLITE_DEFAULTS[slot - 1];
    fields.push(
      {
        parameterId: `gsv.sat${slot}.prn`,
        displayName: `Sat ${slot} PRN`,
        fieldKey: 'prn',
        sentence: 'GSV',
        satelliteSlot: slot,
        dataType: 'uint16',
        plausibleMin: 0,
        plausibleMax: 99,
        generator: { type: 'static', value: defaults.prn }
      },
      {
        parameterId: `gsv.sat${slot}.elevation`,
        displayName: `Sat ${slot} Elevation`,
        fieldKey: 'elevation',
        sentence: 'GSV',
        satelliteSlot: slot,
        dataType: 'uint16',
        unit: 'deg',
        plausibleMin: 0,
        plausibleMax: 90,
        generator: { type: 'static', value: defaults.elevation }
      },
      {
        parameterId: `gsv.sat${slot}.azimuth`,
        displayName: `Sat ${slot} Azimuth`,
        fieldKey: 'azimuth',
        sentence: 'GSV',
        satelliteSlot: slot,
        dataType: 'uint16',
        unit: 'deg',
        plausibleMin: 0,
        plausibleMax: 359,
        generator: { type: 'static', value: defaults.azimuth }
      },
      {
        parameterId: `gsv.sat${slot}.snr`,
        displayName: `Sat ${slot} SNR`,
        fieldKey: 'snr',
        sentence: 'GSV',
        satelliteSlot: slot,
        dataType: 'uint16',
        unit: 'dB-Hz',
        plausibleMin: 0,
        plausibleMax: 99,
        generator: { type: 'random', min: 30, max: 50 }
      }
    );
  }

  return fields;
}

function toParameter(spec: NmeaFieldSpec): NmeaTemplateParameter {
  return {
    parameterId: spec.parameterId,
    displayName: spec.displayName,
    dataType: spec.dataType,
    unit: spec.unit,
    plausibleMin: spec.plausibleMin,
    plausibleMax: spec.plausibleMax,
    decimalPlaces: spec.decimalPlaces,
    generator: spec.generator,
    nmeaMapping: {
      sentence: spec.sentence,
      fieldKey: spec.fieldKey,
      satelliteSlot: spec.satelliteSlot
    }
  };
}

export function createNmeaParameters(): NmeaTemplateParameter[] {
  return [...GGA_FIELDS, ...RMC_FIELDS, ...gsvFields()].map(toParameter);
}
