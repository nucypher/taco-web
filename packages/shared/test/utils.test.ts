import { describe, expect, it } from 'vitest';
import { fromJSON, toBytes, toJSON } from '../src';

describe('custom parameters', () => {
  it('serializes/deserializes bytes to/from hex strings', () => {
    const data = toBytes('helloworld');
    const result = toJSON({ x: data });

    const expectedHex = '68656c6c6f776f726c64'; // "helloworld" in hex
    expect(result).toEqual(`{"x":"0x${expectedHex}"}`);

    const deserializedData = fromJSON(result);
    expect(deserializedData['x']).toEqual(data);
  });

  describe('serializes bigints appropriately based on value', () => {
    it.each([
      BigInt(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      ),
      BigInt(
        '-57896044618658097711785492504343953926634992332820282019728792003956564819968',
      ),
      BigInt(Number.MAX_SAFE_INTEGER + 1),
      BigInt(Number.MIN_SAFE_INTEGER - 1),
    ])("numbers outside of safe range serialized as '${value}n'", (value) => {
      const result = toJSON({ x: value });
      expect(result).toEqual(`{"x":"${value}n"}`);

      const deserializedData = fromJSON(result);
      expect(deserializedData['x']).toEqual(value);
    });

    it.each([
      987654321,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      BigInt(Number.MAX_SAFE_INTEGER),
      BigInt(Number.MAX_SAFE_INTEGER - 1),
      BigInt(Number.MIN_SAFE_INTEGER),
      BigInt(Number.MIN_SAFE_INTEGER + 1),
      BigInt(23),
      BigInt(-12132312),
    ])('numbers within safe range serialized as numbers', (value) => {
      const result = toJSON({ x: value });
      expect(result).toEqual(`{"x":${value}}`);
      expect(result).not.toContain('e+'); // no floats
    });
  });
});
