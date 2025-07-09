import { fakeUrsulas } from '@nucypher/test-utils';
import axios, { HttpStatusCode } from 'axios';
import { beforeAll, describe, expect, it, MockInstance, vi } from 'vitest';

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
              '0xefgh',
              toBase64(
                new TextEncoder().encode(
                  JSON.stringify({
                    message_hash: '0x1234',
                    signature: '0xbeef',
                  }),
                ),
              ),
            ],
          }
        : {
            '0x1234': [
              '0x5678',
              toBase64(
                new TextEncoder().encode(
                  JSON.stringify({
                    message_hash: '0x1234',
                    signature: '0xdead',
                  }),
                ),
              ),
            ],
            '0xabcd': [
              '0xefgh',
              toBase64(
                new TextEncoder().encode(
                  JSON.stringify({
                    message_hash: '0x1234',
                    signature: '0xbeef',
                  }),
                ),
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
    const mockPackedUserOp = {
      sender: '0x1234',
      nonce: '0x1',
      factory: '0x0',
      factoryData: '0x',
      callData: '0xabc',
      callGasLimit: '0x20000',
      verificationGasLimit: '0x15000',
      preVerificationGas: '0x1000',
      maxFeePerGas: '0xabc',
      maxPriorityFeePerGas: '0x123',
      paymaster: '0x0',
      paymasterVerificationGasLimit: '0x0',
      paymasterPostOpGasLimit: '0x0',
      paymasterData: '0x',
      signature: '0x',
    };

    it('should successfully sign a UserOperation', async () => {
      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
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
            signerAddress: '0xefgh',
          },
        },
        errors: {},
      });
    });

    it('should handle UserOperation signing failures', async () => {
      mockSignUserOp(false);
      const porterClient = new PorterClient(fakePorterUris[2]);

      await expect(
        porterClient.signUserOp(
          {
            '0x1234': JSON.stringify(mockPackedUserOp),
            '0xabcd': JSON.stringify(mockPackedUserOp),
          },
          2,
        ),
      ).rejects.toThrow('Porter returned bad response: 400 - ');
    });

    it('should handle errors from Porter response in UserOperation signing', async () => {
      // Mock a response with errors from Porter
      mockSignUserOp(true, true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
        },
        2,
      );

      expect(result).toEqual({
        signingResults: {
          '0xabcd': {
            messageHash: '0x1234',
            signature: '0xbeef',
            signerAddress: '0xefgh',
          },
        },
        errors: {
          '0x1234': 'Failed to sign',
        },
      });
    });

    it('should include error when message hashes do not match', async () => {
      const createMismatchedResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0x1234',
                      signature: '0xdead',
                    }),
                  ),
                ),
              ],
              '0xabcd': [
                '0xefgh',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0xdifferent', // Different message hash
                      signature: '0xbeef',
                    }),
                  ),
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
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
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
            messageHash: '0xdifferent', // Different hash
            signature: '0xbeef',
            signerAddress: '0xefgh',
          },
        },
        errors: {}, // No errors - mismatched hashes don't generate errors, just prevent aggregation
      });
    });

    it('should not return aggregated signature when threshold not met', async () => {
      const createInsufficientResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0x1234',
                      signature: '0xdead',
                    }),
                  ),
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
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
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
      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
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
            signerAddress: '0xefgh',
          },
        },
        errors: {},
      });
    });

    it('should handle decode errors', async () => {
      const createOptimisticErrorResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0x1234',
                      signature: '0xdead',
                    }),
                  ),
                ),
              ],
              '0xabcd': ['0xefgh', 'invalid-base64-data!!!'], // Invalid signature data
            },
            errors: {},
          },
        },
      });

      vi.spyOn(axios, 'request').mockImplementation(async (config) => {
        if (config.url === '/sign' && config.baseURL === fakePorterUris[2]) {
          return Promise.resolve({
            status: HttpStatusCode.Ok,
            data: createOptimisticErrorResponse(),
          });
        }
      });

      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
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
        },
        errors: {
          '0xabcd': expect.stringContaining('Failed to decode signature'), // Decode error
        },
      });
    });

    it('should aggregate only threshold-meeting hash', async () => {
      const createMixedHashResponse = () => ({
        result: {
          signing_results: {
            signatures: {
              '0x1234': [
                '0x5678',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0xhash1',
                      signature: '0xdead',
                    }),
                  ),
                ),
              ],
              '0xabcd': [
                '0xefgh',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0xhash1', // Same hash, meets threshold
                      signature: '0xbeef',
                    }),
                  ),
                ),
              ],
              '0xdef0': [
                '0xabc1',
                toBase64(
                  new TextEncoder().encode(
                    JSON.stringify({
                      message_hash: '0xhash2', // Different hash, doesn't meet threshold
                      signature: '0xcafe',
                    }),
                  ),
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
          '0x1234': JSON.stringify(mockPackedUserOp),
          '0xabcd': JSON.stringify(mockPackedUserOp),
          '0xdef0': JSON.stringify(mockPackedUserOp),
        },
        2, // threshold of 2
      );

      expect(result).toEqual({
        // different hashes returned separately
        signingResults: {
          '0x1234': {
            messageHash: '0xhash1',
            signature: '0xdead',
            signerAddress: '0x5678',
          },
          '0xabcd': {
            messageHash: '0xhash1',
            signature: '0xbeef',
            signerAddress: '0xefgh',
          },
          '0xdef0': {
            messageHash: '0xhash2',
            signature: '0xcafe',
            signerAddress: '0xabc1',
          },
        },
        errors: {},
      });
    });
  });
});
