import {describe, expect, it} from 'vitest';

import { EthAddressSchema } from '../src';


describe('ethereum address schema', () => {
  it('should accept valid ethereum address', () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    EthAddressSchema.parse(validAddress);
  });

  it('should reject invalid ethereum address', () => {
    const invalidAddress = '0x123456789012345678901234567890123456789';
    expect(() => EthAddressSchema.parse(invalidAddress)).toThrow();
  });
});
