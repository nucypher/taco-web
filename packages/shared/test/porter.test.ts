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
  toHexString,
  Ursula,
  toBase64,
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

const createMockSignResponse = (type: string) => ({
  result: {
    digest: '0x1234',
    signing_results: {
      '0x1234': ['0x5678', toBase64(new TextEncoder().encode(JSON.stringify({
        message_hash: '0x1234',
        signature: '0x90ab'
      })))],
      '0xabcd': ['0xefgh', toBase64(new TextEncoder().encode(JSON.stringify({
        message_hash: '0x1234',
        signature: '0xijkl'
      })))]
    }
  },
  version: '5.2.0',
});

const createMockSignImplementation = (endpoint: string, type: string) => (success: boolean = true): MockInstance => {
  return vi.spyOn(axios, 'request').mockImplementation(async (config) => {
    if (config.url === endpoint) {
      if (success) {
        return Promise.resolve({
          status: HttpStatusCode.Ok,
          data: createMockSignResponse(type),
        });
      }
      return Promise.resolve({ status: HttpStatusCode.BadRequest, data: '' });
    }
    throw new Error('Unexpected endpoint');
  });
};

const mockSign191 = createMockSignImplementation('/sign191', 'eip191');
const mockSignUserOp = createMockSignImplementation('/sign', 'userOp:zerodev');

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

  describe('sign191', () => {
    it('should successfully sign a message', async () => {
      mockSign191(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const payload = new TextEncoder().encode('Hello, TACo!');
      const result = await porterClient.sign191(payload, 5, {
        optimistic: true,
        returnAggregated: true
      });

      expect(result).toEqual({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl', // Combined signatures in sorted order
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });
    });

    it('should handle signing failures', async () => {
      mockSign191(false);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const payload = new TextEncoder().encode('Hello, TACo!');

      await expect(
        porterClient.sign191(payload, 5, {
          optimistic: true,
          returnAggregated: true
        })
      ).rejects.toThrow('Porter returned bad response: 400 - ');
    });
  });

  describe('signUserOp', () => {
    const mockPackedUserOp = {
      sender: '0x1234',
      nonce: '0x1',
      init_code: '0x',
      call_data: '0xabc',
      call_gas_limit: '0x20000',
      verification_gas_limit: '0x15000',
      pre_verification_gas: '0x1000',
      max_fee_per_gas: '0xabc',
      max_priority_fee_per_gas: '0x123',
      paymaster_and_data: '0x',
      signature: '0x',
    };

    it('should successfully sign a UserOperation', async () => {
      mockSignUserOp(true);
      const porterClient = new PorterClient(fakePorterUris[2]);
      const result = await porterClient.signUserOp(
        mockPackedUserOp,
        8453,
        'zerodev:v0.6',
        5,
        {
          optimistic: true,
          returnAggregated: true
        }
      );

      expect(result).toEqual({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl', // Combined signatures in sorted order
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'zerodev:v0.6',
      });
    });

    it('should handle UserOperation signing failures', async () => {
      mockSignUserOp(false);
      const porterClient = new PorterClient(fakePorterUris[2]);

      await expect(
        porterClient.signUserOp(
          mockPackedUserOp,
          8453,
          'zerodev:v0.6',
          5,
          {
            optimistic: true,
            returnAggregated: true
          }
        )
      ).rejects.toThrow('Porter returned bad response: 400 - ');
    });
  });
});
