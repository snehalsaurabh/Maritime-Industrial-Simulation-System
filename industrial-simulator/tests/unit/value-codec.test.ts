import { encodeBoolean, encodeRegisters } from '../../src/protocols/modbus-tcp/value-codec.js';

describe('Modbus value codec', () => {
  it('encodes float32 values into two registers', () => {
    const registers = encodeRegisters(100, 'float32', {
      byteOrder: 'big-endian',
      wordOrder: 'big-endian'
    });

    expect(registers).toHaveLength(2);
  });

  it('encodes booleans for coils', () => {
    expect(encodeBoolean(true)).toBe(true);
    expect(encodeBoolean(0)).toBe(false);
    expect(encodeBoolean('true')).toBe(true);
  });
});
