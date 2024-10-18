import { describe, expect, it } from 'vitest';

import { EthAddressSchema } from '../src';

describe('ethereum address schema', () => {
  it('should accept valid ethereum address', () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    EthAddressSchema.parse(validAddress);
  });

  it('should accept unchecksummed ethereum address', () => {
    const validAddress = '0x0123456789abcdefedcb0123456789abcdefedcb';
    EthAddressSchema.parse(validAddress);
  });

  it('should accept checksummed ethereum address', () => {
    const validAddress = '0x0123456789aBcDeFEdCb0123456789abcdEfeDcb';
    EthAddressSchema.parse(validAddress);
  });

  it('should reject invalid ethereum address (shorter)', () => {
    const invalidAddress = '0x123456789012345678901234567890123456789';
    expect(() => EthAddressSchema.parse(invalidAddress)).toThrow();
  });

  it('should reject invalid ethereum address (longer)', () => {
    const invalidAddress = '0x12345678901234567890123456789012345678901';
    expect(() => EthAddressSchema.parse(invalidAddress)).toThrow();
  });
});
