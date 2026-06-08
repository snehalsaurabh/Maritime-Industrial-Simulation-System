export function formatLatitude(decimalDegrees: number): { coordinate: string; hemisphere: string } {
  const hemisphere = decimalDegrees >= 0 ? 'N' : 'S';
  return {
    coordinate: formatCoordinate(Math.abs(decimalDegrees), true),
    hemisphere
  };
}

export function formatLongitude(decimalDegrees: number): { coordinate: string; hemisphere: string } {
  const hemisphere = decimalDegrees >= 0 ? 'E' : 'W';
  return {
    coordinate: formatCoordinate(Math.abs(decimalDegrees), false),
    hemisphere
  };
}

function formatCoordinate(absDegrees: number, isLatitude: boolean): string {
  const degrees = Math.floor(absDegrees);
  const minutes = (absDegrees - degrees) * 60;
  const degreeDigits = isLatitude ? 2 : 3;
  const degreePart = degrees.toString().padStart(degreeDigits, '0');
  const minutePart = minutes.toFixed(4).padStart(7, '0');
  return `${degreePart}${minutePart}`;
}

export function formatNumeric(value: number, decimalPlaces = 1): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return value.toFixed(decimalPlaces);
}

export function formatInteger(value: number, width = 0): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const rounded = Math.round(value);
  return width > 0 ? rounded.toString().padStart(width, '0') : rounded.toString();
}

export function formatAzimuth(value: number): string {
  return formatInteger(value, 3);
}

export function nmeaChecksum(payload: string): string {
  let checksum = 0;
  for (const character of payload) {
    checksum ^= character.charCodeAt(0);
  }
  return checksum.toString(16).toUpperCase().padStart(2, '0');
}

export function wrapSentence(talkerId: string, sentenceType: string, fields: string[]): string {
  const body = `${talkerId}${sentenceType},${fields.join(',')}`;
  return `$${body}*${nmeaChecksum(body)}`;
}
