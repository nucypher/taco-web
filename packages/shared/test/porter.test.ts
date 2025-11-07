import { fakeUrsulas } from '@nucypher/test-utils';
import axios, { HttpStatusCode } from 'axios';
import { beforeAll, describe, expect, it, MockInstance, vi } from 'vitest';

import {
  PackedUserOperation,
  PackedUserOperationSignatureRequest,
  SessionStaticSecret,
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

const createMockSignResponse = (errorCase?: boolean) => {
  // mimic requester public key obtained from original encrypted request
  const requesterPk = SessionStaticSecret.random().publicKey();

  const response = {
    result: {
      signing_results: {
        encrypted_signature_responses: errorCase
          ? {
              '0xabcd': [
                toBase64(
                  new SignatureResponse(
                    '0x0000000000000000000000000000000000000001',
                    fromHexString('0x1234'),
                    fromHexString('0xbeef'),
                    0,
                  )
                    .encrypt(
                      SessionStaticSecret.random().deriveSharedSecret(
                        requesterPk,
                      ),
                    )
                    .toBytes(),
                ),
              ],
            }
          : {
              '0x1234': [
                toBase64(
                  new SignatureResponse(
                    '0x0000000000000000000000000000000000000002',
                    fromHexString('0x1234'),
                    fromHexString('0xdead'),
                    0,
                  )
                    .encrypt(
                      SessionStaticSecret.random().deriveSharedSecret(
                        requesterPk,
                      ),
                    )
                    .toBytes(),
                ),
              ],
              '0xabcd': [
                toBase64(
                  new SignatureResponse(
                    '0x0000000000000000000000000000000000000001',
                    fromHexString('0x1234'),
                    fromHexString('0xbeef'),
                    0,
                  )
                    .encrypt(
                      SessionStaticSecret.random().deriveSharedSecret(
                        requesterPk,
                      ),
                    )
                    .toBytes(),
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
  };

  return response;
};

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
    let requesterSk: SessionStaticSecret;
    let requesterPk: any;

    beforeAll(async () => {
      requesterSk = SessionStaticSecret.random();
      requesterPk = requesterSk.publicKey();
    });

    const createUserOpSignatureRequest = () =>
      new UserOperationSignatureRequest(
        new UserOperation(
          '0x000000000000000000000000000000000000000a',
          BigInt(123), // nonce
          fromHexString('0xabc'), // callData
          BigInt(456), // callGasLimit
          BigInt(789), // verificationGasLimit
          BigInt(101112), // preVerificationGasLimit
          BigInt(131415), // maxFeePerGas
          BigInt(161718), // maxPriorityFeePerGas
        ),
        1, // cohort ID
        BigInt(1), // chain ID
        '0.8.0',
        null,
      );

    it('should successfully sign a UserOperation', async () => {
      const userOpSignatureRequest = createUserOpSignatureRequest();

      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
          '0xabcd': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
        },
        2,
      );

      expect(Object.keys(result.errors).length).toBe(0);
      expect(Object.keys(result.encryptedResponses).length).toBe(2);
    });

    it('should successfully sign a PackedUserOperation', async () => {
      const packedUserOperationSignatureRequest =
        new PackedUserOperationSignatureRequest(
          new PackedUserOperation(
            '0x000000000000000000000000000000000000000a',
            BigInt(123), // nonce
            fromHexString('0xabc'), // initCode
            fromHexString('0xdef'), // callData
            fromHexString('0x01020304'), // accountGasLimit
            BigInt(101112), // preVerificationGas
            fromHexString('0x05060708'), // gasFees
            fromHexString('0x090a0b0c'), // paymasterAndData
          ),
          1, // cohort ID
          BigInt(1), // chain ID
          'mdt',
          null,
        );

      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': packedUserOperationSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
          '0xabcd': packedUserOperationSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
        },
        2,
      );

      expect(Object.keys(result.errors).length).toBe(0);
      expect(Object.keys(result.encryptedResponses).length).toBe(2);
    });

    it('should handle UserOperation signing failures', async () => {
      const userOpSignatureRequest = createUserOpSignatureRequest();

      mockSignUserOp(false);
      const porterClient = new PorterClient(fakePorterUris[2]);

      await expect(
        porterClient.signUserOp(
          {
            '0x1234': userOpSignatureRequest.encrypt(
              requesterSk.deriveSharedSecret(
                SessionStaticSecret.random().publicKey(),
              ),
              requesterPk,
            ),
            '0xabcd': userOpSignatureRequest.encrypt(
              requesterSk.deriveSharedSecret(
                SessionStaticSecret.random().publicKey(),
              ),
              requesterPk,
            ),
          },
          2,
        ),
      ).rejects.toThrow('Porter returned bad response: 400 - ');
    });

    it('should handle errors from Porter response in UserOperation signing', async () => {
      const userOpSignatureRequest = createUserOpSignatureRequest();

      // Mock a response with errors from Porter
      mockSignUserOp(true, true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
          '0xabcd': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
        },
        2,
      );

      expect(Object.keys(result.encryptedResponses).length).toBe(1);
      expect(result.errors).toEqual({
        '0x1234': 'Failed to sign',
      });
    });

    it('should successfully sign', async () => {
      const userOpSignatureRequest = createUserOpSignatureRequest();

      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        {
          '0x1234': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
          '0xabcd': userOpSignatureRequest.encrypt(
            requesterSk.deriveSharedSecret(
              SessionStaticSecret.random().publicKey(),
            ),
            requesterPk,
          ),
        },
        2,
      );

      expect(Object.keys(result.errors).length).toBe(0);
      expect(Object.keys(result.encryptedResponses).length).toBe(2);
    });
  });
});
