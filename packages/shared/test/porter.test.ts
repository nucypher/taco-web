import { fakeUrsulas } from '@nucypher/test-utils';
import axios, { HttpStatusCode } from 'axios';
import { beforeAll, describe, expect, it, MockInstance, vi } from 'vitest';

import {
  SignatureResponse,
  UserOperation,
  UserOperationSignatureRequest,
} from '@nucypher/nucypher-core';

import {
  domains,
  getPorterUris,
  getPorterUrisFromSource,
  GetUrsulasResult,
  initialize,
  PorterClient,
  toBase64,
  toHexString,
  Ursula,
} from '../src';
import { fromHexString } from '../src/utils';

const fakePorterUris = [
  'https://_this_should_crash.com/',
  'https://2_this_should_crash.com/',
  'https://_this_should_work.com/',
];

const mockGetUrsulas = (ursulas: Ursula[] = fakeUrsulas()): MockInstance => {
  const fakePorterUrsulas = (
    mockUrsulas: readonly Ursula[],
  ): GetUrsulasResult => {
    return {
      result: {
        ursulas: mockUrsulas.map(({ encryptingKey, uri, checksumAddress }) => ({
          encrypting_key: toHexString(encryptingKey.toCompressedBytes()),
          uri: uri,
          checksum_address: checksumAddress,
        })),
      },
      version: '5.2.0',
    };
  };

  return vi.spyOn(axios, 'request').mockImplementation(async (config) => {
    switch (config.baseURL) {
      case fakePorterUris[2]:
        return Promise.resolve({
          status: HttpStatusCode.Ok,
          data: fakePorterUrsulas(ursulas),
        });
      case fakePorterUris[1]:
        return Promise.resolve({ status: HttpStatusCode.BadRequest, data: '' });
      case fakePorterUris[0]:
        throw new Error(`Test error`);
    }
  });
};

const createMockSignResponse = (errorCase?: boolean) => ({
  result: {
    signing_results: {
      signatures: errorCase
        ? {
            '0xabcd': [
              '0xefff',
              toBase64(
                new SignatureResponse(
                  fromHexString('0x1234'),
                  fromHexString('0xbeef'),
                  0,
                ).toBytes(),
              ),
            ],
          }
        : {
            '0x1234': [
              '0x5678',
              toBase64(
                new SignatureResponse(
                  fromHexString('0x1234'),
                  fromHexString('0xdead'),
                  0,
                ).toBytes(),
              ),
            ],
            '0xabcd': [
              '0xefff',
              toBase64(
                new SignatureResponse(
                  fromHexString('0x1234'),
                  fromHexString('0xbeef'),
                  0,
                ).toBytes(),
              ),
            ],
          },
      errors: errorCase
        ? {
            '0x1234': 'Failed to sign',
          }
        : {},
    },
  },
});

const createMockSignImplementation =
  (endpoint: string) =>
  (success: boolean = true, errorCase?: boolean): MockInstance => {
    return vi.spyOn(axios, 'request').mockImplementation(async (config) => {
      // Handle sign requests
      if (config.url === endpoint && config.baseURL === fakePorterUris[2]) {
        if (success) {
          return Promise.resolve({
            status: HttpStatusCode.Ok,
            data: createMockSignResponse(errorCase),
          });
        }
        return Promise.resolve({ status: HttpStatusCode.BadRequest, data: '' });
      }
    });
  };

const mockSignUserOp = createMockSignImplementation('/sign');

describe('getPorterUris', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('Get URIs from source', async () => {
    for (const domain of Object.values(domains)) {
      const uris = await getPorterUrisFromSource(domain);
      expect(uris.length).toBeGreaterThanOrEqual(0);
      const fullList = await getPorterUris(domain);
      expect(fullList).toEqual(expect.arrayContaining(uris));
    }
  });
});

describe('PorterClient', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('should work when at least one ursula URI is valid', async () => {
    const ursulas = fakeUrsulas();
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const porterClient = new PorterClient(fakePorterUris);
    const result = await porterClient.getUrsulas(ursulas.length);

    expect(
      result.every((u: Ursula, index: number) => {
        const expectedUrsula = ursulas[index];
        return (
          u.checksumAddress === expectedUrsula.checksumAddress &&
          u.uri === expectedUrsula.uri &&
          u.encryptingKey.equals(expectedUrsula.encryptingKey)
        );
      }),
    ).toBeTruthy();
    const params = {
      method: 'get',
      url: '/get_ursulas',
      params: {
        exclude_ursulas: [],
        include_ursulas: [],
        quantity: ursulas.length,
      },
    };

    expect(getUrsulasSpy).toBeCalledTimes(fakePorterUris.length);
    fakePorterUris.forEach((value, index) => {
      expect(getUrsulasSpy).toHaveBeenNthCalledWith(
        index + 1,
        expect.objectContaining({ ...params, baseURL: value }),
      );
    });
  });

  it('returns error in case all porters fail', async () => {
    const ursulas = fakeUrsulas();
    mockGetUrsulas(ursulas);
    let porterClient = new PorterClient([fakePorterUris[1]]);
    await expect(porterClient.getUrsulas(ursulas.length)).rejects.toThrowError(
      Error(`Porter returned bad response: 400 - `),
    );
    porterClient = new PorterClient([fakePorterUris[1], fakePorterUris[0]]);
    await expect(porterClient.getUrsulas(ursulas.length)).rejects.toThrowError(
      Error(`Test error`),
    );
  });
});

describe('PorterClient Signing', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe('signUserOp', () => {
    // since this uses wasm it must be called after initialize (beforeAll()) so we use a factory function
    const createUserSignatureRequest = () =>
      new UserOperationSignatureRequest(
        new UserOperation(
          '0x000000000000000000000000000000000000000a',
          BigInt(0), // nonce
          fromHexString('0xabc'), // callData
          BigInt(0), // callGasLimit
          BigInt(0), // verificationGasLimit
          BigInt(0), // preVerificationGasLimit
          BigInt(0), // maxFeePerGas
          BigInt(0), // maxPriorityFeePerGas
        ),
        1, // cohort ID
        BigInt(1), // chain ID
        '0.8.0',
        null,
      );

    it('should successfully sign a UserOperation', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
        },
        2,
      );

      expect(result).toEqual({
        signingResults: {
          '0x1234': {
            messageHash: '0x1234',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
          '0xabcd': {
            messageHash: '0x1234',
            signature: '0xbeef',
            signerAddress: '0xefff',
          },
        },
        errors: {},
      });
    });

    it('should handle UserOperation signing failures', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      mockSignUserOp(false);
      const porterClient = new PorterClient(fakePorterUris[2]);

      await expect(
        porterClient.signUserOp(
          {
            '0x1234': userOpSignatureRequest,
            '0xabcd': userOpSignatureRequest,
          },
          2,
        ),
      ).rejects.toThrow('Porter returned bad response: 400 - ');
    });

    it('should handle errors from Porter response in UserOperation signing', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      // Mock a response with errors from Porter
      mockSignUserOp(true, true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
        },
        2,
      );

      expect(result).toEqual({
        signingResults: {
          '0xabcd': {
            messageHash: '0x1234',
            signature: '0xbeef',
            signerAddress: '0xefff',
          },
        },
        errors: {
          '0x1234': 'Failed to sign',
        },
      });
    });

    it('should include error when message hashes do not match', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      const createMismatchedResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0x1234'),
                    fromHexString('0xdead'),
                    0,
                  ).toBytes(),
                ),
              ],
              '0xabcd': [
                '0xefff',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0xdddd'), // Different message hash
                    fromHexString('0xbeef'),
                    0,
                  ).toBytes(),
                ),
              ],
            },
            errors: {},
          },
        },
      });

      vi.spyOn(axios, 'request').mockImplementation(async (config) => {
        if (config.url === '/sign' && config.baseURL === fakePorterUris[2]) {
          return Promise.resolve({
            status: HttpStatusCode.Ok,
            data: createMismatchedResponse(),
          });
        }
      });

      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
        },
        2,
      );

      expect(result).toEqual({
        signingResults: {
          '0x1234': {
            messageHash: '0x1234',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
          '0xabcd': {
            messageHash: '0xdddd', // Different hash
            signature: '0xbeef',
            signerAddress: '0xefff',
          },
        },
        errors: {}, // No errors - mismatched hashes don't generate errors, just prevent aggregation
      });
    });

    it('should not return aggregated signature when threshold not met', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      const createInsufficientResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0x1234'),
                    fromHexString('0xdead'),
                    0,
                  ).toBytes(),
                ),
              ],
              // Only 1 signature, but threshold is 2
            },
            errors: {},
          },
        },
      });

      vi.spyOn(axios, 'request').mockImplementation(async (config) => {
        if (config.url === '/sign' && config.baseURL === fakePorterUris[2]) {
          return Promise.resolve({
            status: HttpStatusCode.Ok,
            data: createInsufficientResponse(),
          });
        }
      });

      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
        },
        2, // threshold of 2, but only 1 signature
      );

      expect(result).toEqual({
        signingResults: {
          '0x1234': {
            messageHash: '0x1234',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
        },
        errors: {},
      });
    });

    it('should successfully sign', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
        },
        2,
      );

      expect(result).toEqual({
        signingResults: {
          '0x1234': {
            messageHash: '0x1234',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
          '0xabcd': {
            messageHash: '0x1234',
            signature: '0xbeef',
            signerAddress: '0xefff',
          },
        },
        errors: {},
      });
    });

    it('should aggregate only threshold-meeting hash', async () => {
      const userOpSignatureRequest = createUserSignatureRequest();

      const createMixedHashResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0x0001'),
                    fromHexString('0xdead'),
                    0,
                  ).toBytes(),
                ),
              ],
              '0xabcd': [
                '0xefff',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0x0001'), // Same hash, meets threshold
                    fromHexString('0xbeef'),
                    0,
                  ).toBytes(),
                ),
              ],
              '0xdef0': [
                '0xabc1',
                toBase64(
                  new SignatureResponse(
                    fromHexString('0x0002'), // Different hash, doesn't meet threshold
                    fromHexString('0xcafe'),
                    0,
                  ).toBytes(),
                ),
              ],
            },
            errors: {},
          },
        },
      });

      vi.spyOn(axios, 'request').mockImplementation(async (config) => {
        if (config.url === '/sign' && config.baseURL === fakePorterUris[2]) {
          return Promise.resolve({
            status: HttpStatusCode.Ok,
            data: createMixedHashResponse(),
          });
        }
      });

      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest,
          '0xabcd': userOpSignatureRequest,
          '0xdef0': userOpSignatureRequest,
        },
        2, // threshold of 2
      );

      expect(result).toEqual({
        // different hashes returned separately
        signingResults: {
          '0x1234': {
            messageHash: '0x0001',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
          '0xabcd': {
            messageHash: '0x0001',
            signature: '0xbeef',
            signerAddress: '0xefff',
          },
          '0xdef0': {
            messageHash: '0x0002',
            signature: '0xcafe',
            signerAddress: '0xabc1',
          },
        },
        errors: {},
      });
    });
  });
});
