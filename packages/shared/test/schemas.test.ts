import { describe, expect, it } from 'vitest';

import { BlockIdentifierSchema, EthAddressSchema } from '../src';

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

describe('block identifier address schema', () => {
  it('should accept valid block numbers (ints >= 0)', () => {
    BlockIdentifierSchema.parse(0);
    BlockIdentifierSchema.parse(1);
    BlockIdentifierSchema.parse(1234);
    BlockIdentifierSchema.parse(9007199254740991); // Max safe integer
  });

  it('should accept valid block tags', () => {
    BlockIdentifierSchema.parse('earliest');
    BlockIdentifierSchema.parse('finalized');
    BlockIdentifierSchema.parse('safe');
    BlockIdentifierSchema.parse('latest');
    BlockIdentifierSchema.parse('pending');
  });

  it('should accept valid block hashes', () => {
    const validBlockHash =
      '0x1234567890123456789012345678901234567890123456789012345678901234';
    BlockIdentifierSchema.parse(validBlockHash);
  });

  it('should reject invalid block numbers (e.g., negative ints)', () => {
    expect(() => BlockIdentifierSchema.parse(-42)).toThrow();
  });

  it('should reject invalid block numbers (e.g., float)', () => {
    expect(() => BlockIdentifierSchema.parse(34.56)).toThrow();
  });

  it('should reject invalid block identifiers', () => {
    expect(() => BlockIdentifierSchema.parse('foo')).toThrow();
  });

  it('should reject invalid block hashes', () => {
    const invalidBlockHash = '0x1234';
    expect(() => BlockIdentifierSchema.parse(invalidBlockHash)).toThrow();
  });
});
