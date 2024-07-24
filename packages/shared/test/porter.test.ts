import {
  initialize,
  GetUrsulasResult,
  PorterClient,
  toHexString,
  Ursula,
} from '../src';
import { fakeUrsulas } from '@nucypher/test-utils';
import { beforeAll, describe, expect, SpyInstance, it, vi } from 'vitest';
import axios, { HttpStatusCode } from 'axios';

const fakePorterUris = ['https://_this_should_crash.com/', 'https://2_this_should_crash.com/', 'https://_this_should_work.com/'];

const mockGetUrsulas = (
  ursulas: Ursula[] = fakeUrsulas(),
): SpyInstance => {
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
        return Promise.resolve({ status: HttpStatusCode.Ok, data: fakePorterUrsulas(ursulas) });
      case fakePorterUris[0]:
        throw new Error();
      default:
        throw Promise.resolve({ status: HttpStatusCode.BadRequest });
    }
  });
};

describe('PorterClient', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('Get Ursulas', async () => {
    const ursulas = fakeUrsulas();
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const porterClient = new PorterClient(fakePorterUris);
    const result = await porterClient.getUrsulas(ursulas.length);

    expect(result.every((u: Ursula, index: number) => {
      const expectedUrsula = ursulas[index];
      return u.checksumAddress === expectedUrsula.checksumAddress &&
        u.uri === expectedUrsula.uri &&
        u.encryptingKey.equals(expectedUrsula.encryptingKey);
    })).toBeTruthy();
    const params = {
      method: 'get',
      url: "/get_ursulas",
      params: {
        exclude_ursulas: [],
        include_ursulas: [],
        quantity: ursulas.length,
      }
    };

    expect(getUrsulasSpy).toBeCalledTimes(fakePorterUris.length);
    expect(getUrsulasSpy).toHaveBeenNthCalledWith(1, expect.objectContaining(
      { ...params, baseURL: fakePorterUris[0] })
    );
    expect(getUrsulasSpy).toHaveBeenNthCalledWith(2, expect.objectContaining(
      { ...params, baseURL: fakePorterUris[1] })
    );
    expect(getUrsulasSpy).toHaveBeenNthCalledWith(3, expect.objectContaining(
      { ...params, baseURL: fakePorterUris[2] }));
  });

  it('returns error in case all porters fail', async () => {
    const ursulas = fakeUrsulas();
    mockGetUrsulas(ursulas);
    let porterClient = new PorterClient([fakePorterUris[0], fakePorterUris[1]]);
    expect(porterClient.getUrsulas(ursulas.length)).rejects.toThrowError();
    porterClient = new PorterClient([fakePorterUris[1], fakePorterUris[0]]);
    expect(porterClient.getUrsulas(ursulas.length)).rejects.toThrowError();
  });

});
