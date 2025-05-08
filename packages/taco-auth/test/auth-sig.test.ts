import { describe, expect, it } from 'vitest';

import { eip1271AuthSignatureSchema } from '../src/providers/eip1271/auth';
import { eip4361AuthSignatureSchema } from '../src/providers/eip4361/auth';

const eip4361AuthSignature = {
  signature: 'fake-signature',
  address: '0x0000000000000000000000000000000000000000',
  scheme: 'EIP4361',
  typedData:
    'localhost wants you to sign in with your Ethereum account:\n0x0000000000000000000000000000000000000000\n\nlocalhost wants you to sign in with your Ethereum account: 0x0000000000000000000000000000000000000000\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1234\nNonce: 5ixAg1odyfDnrbfGa\nIssued At: 2024-07-01T10:32:39.631Z',
};

const eip1271AuthSignature = {
  signature: '0xdeadbeef',
  address: '0x0000000000000000000000000000000000000000',
  scheme: 'EIP1271',
  typedData: {
    chain: 23,
    dataHash: '0xdeadbeef',
  },
};

describe('auth signature', () => {
  it('accepts a well-formed EIP4361 auth signature', async () => {
    eip4361AuthSignatureSchema.parse(eip4361AuthSignature);
  });

  it('rejects an EIP4361 auth signature with missing/incorrect fields', async () => {
    expect(() =>
      eip4361AuthSignatureSchema.parse({
        ...eip4361AuthSignature,
        signature: undefined,
      }),
    ).toThrow();

    expect(() =>
      eip4361AuthSignatureSchema.parse({
        ...eip4361AuthSignature,
        scheme: 'EIP1271',
      }),
    ).toThrow();
  });

  it('accepts a well-formed EIP1271 auth signature', async () => {
    eip1271AuthSignatureSchema.parse(eip1271AuthSignature);
  });

  it('rejects an EIP1271 auth signature with missing/incorrect fields', async () => {
    expect(() =>
      eip1271AuthSignatureSchema.parse({
        ...eip1271AuthSignature,
        scheme: 'EIP4361',
      }),
    ).toThrow();

    expect(() =>
      eip1271AuthSignatureSchema.parse({
        ...eip1271AuthSignature,
        typedData: {
          chain: 21,
          dataHash: undefined,
        },
      }),
    ).toThrow();
  });
});
