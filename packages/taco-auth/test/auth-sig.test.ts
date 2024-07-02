import { describe, expect, it } from 'vitest';

import {
  authSignatureSchema,
} from '../src';

const eip712AuthSignature = {
  'signature': 'fake-typed-signature',
  'address': '0x0000000000000000000000000000000000000000',
  'scheme': 'EIP712',
  'typedData': {
    'types': {
      'Wallet': [
        {
          'name': 'address',
          'type': 'address',
        },
        {
          'name': 'signatureText',
          'type': 'string',
        },
        {
          'name': 'blockNumber',
          'type': 'uint256',
        },
        {
          'name': 'blockHash',
          'type': 'bytes32',
        },
      ],
      'EIP712Domain': [
        {
          'name': 'name',
          'type': 'string',
        },
        {
          'name': 'version',
          'type': 'string',
        },
        {
          'name': 'chainId',
          'type': 'uint256',
        },
        {
          'name': 'salt',
          'type': 'bytes32',
        },
      ],
    },
    'domain': {
      'name': 'TACo',
      'version': '1',
      'chainId': 1234,
      'salt': '0x55d90a3b041db6dda74671bc83a25d1508979b19a105be17f57f86fe08627dbd',
    },
    'message': {
      'address': '0x0000000000000000000000000000000000000000',
      'signatureText': 'I\'m the owner of address 0x0000000000000000000000000000000000000000 as of block number 1000',
      'blockNumber': 1000,
      'blockHash': '0x0000000000000000000000000000000000000000',
    },
    'primaryType': 'Wallet',
  },
};
const eip4361AuthSignature = {
  'signature': 'fake-signature',
  'address': '0x0000000000000000000000000000000000000000',
  'scheme': 'EIP4361',
  'typedData': 'localhost wants you to sign in with your Ethereum account:\n0x0000000000000000000000000000000000000000\n\nlocalhost wants you to sign in with your Ethereum account: 0x0000000000000000000000000000000000000000\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1234\nNonce: 5ixAg1odyfDnrbfGa\nIssued At: 2024-07-01T10:32:39.631Z',
};

describe('auth signature', () => {
  it('accepts a well-formed EIP172 auth signature', async () => {
    authSignatureSchema.parse(eip712AuthSignature);
  });

  it('rejects an EIP712 auth signature with missing fields', async () => {
    expect(() => authSignatureSchema.parse({
      ...eip712AuthSignature,
      'signature': undefined,
    })).toThrow();
  });

  it('accepts a well-formed EIP4361 auth signature', async () => {
    authSignatureSchema.parse(eip4361AuthSignature);
  });

  it('rejects an EIP4361 auth signature with missing fields', async () => {
    expect(() => authSignatureSchema.parse({
      ...eip4361AuthSignature,
      'signature': undefined,
    })).toThrow();
  });
});
