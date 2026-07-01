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
  sentence: 'GGA' | 'RMC' | 'GSV' | 'VTG' | 'VHW' | 'MWV' | 'HDT' | 'DBT' | 'RSA';
  dataType: DataType;
  unit?: string;
  plausibleMin?: number;
  plausibleMax?: number;
  decimalPlaces?: number;
  generator: GeneratorDefinition;
  satelliteSlot?: number;
  talkerId:'GP'| 'GN'|'GL'|'VW'|'WI'|'HE'|'SD'|'II'
}

const TELEMETRY_FIELDS: NmeaFieldSpec[] = [
  {
    parameterId: 'dgps.date',
    displayName: 'Date',
    fieldKey: 'date',
    talkerId: 'GP',
    sentence: 'RMC',
    dataType: 'string',
    generator: { type: 'static', value: '130495' }
  },

  {
    parameterId: 'dgps.localTime',
    displayName: 'Local Time',
    fieldKey: 'localTime',
    talkerId: 'GP',
    sentence: 'RMC',
    dataType: 'string',
    generator: { type: 'static', value: '023230' }
  },

  {
    parameterId: 'dgps.gmtTime',
    displayName: 'GMT Time',
    fieldKey: 'utcTime',
    talkerId: 'GP',
    sentence: 'RMC',
    dataType: 'string',
    generator: { type: 'static', value: '210230' }
  },

  {
    parameterId: 'dgps.localTimeZoneOffset',
    displayName: 'Local Time Zone Offset',
    fieldKey: 'localTimeZoneOffset',
    talkerId: 'GP',
    sentence: 'RMC',
    dataType: 'int16',
    unit: 'hours',
    generator: { type: 'static', value: 5 }
  },

  {
    parameterId: 'dgps.latitude',
    displayName: 'Latitude',
    fieldKey: 'latitude',
    talkerId: 'GP',
    sentence: 'GGA',
    dataType: 'float64',
    unit: 'deg',
    generator: { type: 'static', value: 38.924145 }
  },

  {
    parameterId: 'dgps.longitude',
    displayName: 'Longitude',
    fieldKey: 'longitude',
    talkerId: 'GP',
    sentence: 'GGA',
    dataType: 'float64',
    unit: 'deg',
    generator: { type: 'static', value: -94.766785 }
  },

  {
    parameterId: 'dgps.courseOverGroundTrue',
    displayName: 'Course Over Ground (True)',
    fieldKey: 'courseOverGround',
    talkerId: 'GP',
    sentence: 'VTG',
    dataType: 'float32',
    unit: 'deg',
    generator: { type: 'linear-ramp', min: 0, max: 359, step: 1 }
  },

  {
    parameterId: 'dgps.courseOverGroundMagnetic',
    displayName: 'Course Over Ground (Magnetic)',
    fieldKey: 'courseOverGroundMagnetic',
    talkerId: 'GP',
    sentence: 'VTG',
    dataType: 'float32',
    unit: 'deg',
    generator: { type: 'linear-ramp', min: 0, max: 359, step: 1 }
  },

  {
    parameterId: 'dgps.speedOverGround',
    displayName: 'Speed Over Ground',
    fieldKey: 'speedOverGroundKnots',
    talkerId: 'GP',
    sentence: 'VTG',
    dataType: 'float32',
    unit: 'kn',
    generator: { type: 'linear-ramp', min: 0, max: 18, step: 0.5 }
  },

  {
    parameterId: 'dgps.timeSinceLastUpdate',
    displayName: 'Time Since Last DGPS Update',
    fieldKey: 'timeSinceLastUpdate',
    talkerId: 'GP',
    sentence: 'GGA',
    dataType: 'float32',
    unit: 's',
    generator: { type: 'linear-ramp', min: 0, max: 10, step: 1 }
  },

  {
    parameterId: 'speedlog.speedThroughWater',
    displayName: 'Speed Through Water',
    fieldKey: 'speedThroughWaterKnots',
    talkerId: 'VW',
    sentence: 'VHW',
    dataType: 'float32',
    unit: 'kn',
    generator: { type: 'linear-ramp', min: 0, max: 18, step: 0.5 }
  },

  {
    parameterId: 'anemometer.windSpeed',
    displayName: 'Wind Speed',
    fieldKey: 'windSpeed',
    talkerId: 'WI',
    sentence: 'MWV',
    dataType: 'float32',
    unit: 'kn',
    generator: { type: 'linear-ramp', min: 0, max: 60, step: 1 }
  },

  {
    parameterId: 'anemometer.windDirection',
    displayName: 'Wind Direction True',
    fieldKey: 'windDirection',
    talkerId: 'WI',
    sentence: 'MWV',
    dataType: 'float32',
    unit: 'deg',
    generator: { type: 'linear-ramp', min: 0, max: 359, step: 5 }
  },

  {
    parameterId: 'gyro.headingTrue',
    displayName: 'Heading True',
    fieldKey: 'headingTrue',
    talkerId: 'HE',
    sentence: 'HDT',
    dataType: 'float32',
    unit: 'deg',
    generator: { type: 'linear-ramp', min: 0, max: 359, step: 1 }
  },

  {
    parameterId: 'echosounder.depthMeters',
    displayName: 'Depth',
    fieldKey: 'depthMeters',
    talkerId: 'SD',
    sentence: 'DBT',
    dataType: 'float32',
    unit: 'm',
    generator: { type: 'linear-ramp', min: 5, max: 120, step: 0.5 }
  },

  {
    parameterId: 'rudder.rudderAngle',
    displayName: 'Rudder Angle',
    fieldKey: 'starboardRudderAngle',
    talkerId: 'II',
    sentence: 'RSA',
    dataType: 'float32',
    unit: 'deg',
    generator: { type: 'linear-ramp', min: -35, max: 35, step: 1 }
  }
];

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

export function createNmeaParameters(talkerId:string): NmeaTemplateParameter[] {
  return [...TELEMETRY_FIELDS].filter(field => field.talkerId === talkerId).map(toParameter); //...gsvFields()
}
