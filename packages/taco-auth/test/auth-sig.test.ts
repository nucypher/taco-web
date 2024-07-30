import { describe, expect, it } from 'vitest';

import { authSignatureSchema } from '../src';

const eip4361AuthSignature = {
  signature: 'fake-signature',
  address: '0x0000000000000000000000000000000000000000',
  scheme: 'EIP4361',
  typedData:
    'localhost wants you to sign in with your Ethereum account:\n0x0000000000000000000000000000000000000000\n\nlocalhost wants you to sign in with your Ethereum account: 0x0000000000000000000000000000000000000000\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1234\nNonce: 5ixAg1odyfDnrbfGa\nIssued At: 2024-07-01T10:32:39.631Z',
};

describe('auth signature', () => {
  it('accepts a well-formed EIP4361 auth signature', async () => {
    authSignatureSchema.parse(eip4361AuthSignature);
  });

  it('rejects an EIP4361 auth signature with missing fields', async () => {
    expect(() =>
      authSignatureSchema.parse({
        ...eip4361AuthSignature,
        signature: undefined,
      }),
    ).toThrow();
  });
});
