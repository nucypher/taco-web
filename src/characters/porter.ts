import { CapsuleFrag, PublicKey, TreasureMap } from '@nucypher/nucypher-core';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';

import { RetrievalKit } from '../core';
import { Base64EncodedBytes, ChecksumAddress, HexEncodedBytes } from '../types';
import { fromBase64, fromHexString, toBase64, toHexString } from '../utils';

export type Ursula = {
  readonly checksumAddress: ChecksumAddress;
  readonly uri: string;
  readonly encryptingKey: PublicKey;
};

type GetUrsulasRequest = {
  readonly quantity: number;
  readonly exclude_ursulas?: readonly ChecksumAddress[];
  readonly include_ursulas?: readonly ChecksumAddress[];
};

type UrsulaResponse = {
  readonly checksum_address: ChecksumAddress;
  readonly uri: string;
  readonly encrypting_key: HexEncodedBytes;
};

export type GetUrsulasResponse = {
  readonly result: {
    readonly ursulas: readonly UrsulaResponse[];
  };
  readonly version: string;
};

type PostRetrieveCFragsRequest = {
  readonly treasure_map: Base64EncodedBytes;
  readonly retrieval_kits: readonly Base64EncodedBytes[];
  readonly alice_verifying_key: HexEncodedBytes;
  readonly bob_encrypting_key: HexEncodedBytes;
  readonly bob_verifying_key: HexEncodedBytes;
};

type PostRetrieveCFragsResult = {
  readonly result: {
    readonly retrieval_results: readonly {
      readonly cfrags: {
        readonly [address: string]: string;
      };
    }[];
  };
  readonly version: string;
};

export type RetrieveCFragsResponse = Record<ChecksumAddress, CapsuleFrag>;

export class Porter {
  private readonly porterUri: URL;

  constructor(porterUri: string) {
    this.porterUri = new URL(porterUri);
  }

  public async getUrsulas(
    quantity: number,
    excludeUrsulas?: readonly ChecksumAddress[],
    includeUrsulas?: readonly ChecksumAddress[]
  ): Promise<readonly Ursula[]> {
    const params: GetUrsulasRequest = {
      quantity,
      exclude_ursulas: excludeUrsulas,
      include_ursulas: includeUrsulas,
    };
    const resp: AxiosResponse<GetUrsulasResponse> = await axios.get(
      `${this.porterUri}/get_ursulas`,
      {
        params,
        paramsSerializer: (params) => {
          return qs.stringify(params, { arrayFormat: 'comma' });
        },
      }
    );
    return resp.data.result.ursulas.map((u: UrsulaResponse) => ({
      checksumAddress: u.checksum_address,
      uri: u.uri,
      encryptingKey: PublicKey.fromBytes(fromHexString(u.encrypting_key)),
    }));
  }

  public async retrieveCFrags(
    treasureMap: TreasureMap,
    retrievalKits: readonly RetrievalKit[],
    aliceVerifyingKey: PublicKey,
    bobEncryptingKey: PublicKey,
    bobVerifyingKey: PublicKey
  ): Promise<readonly RetrieveCFragsResponse[]> {
    const data: PostRetrieveCFragsRequest = {
      treasure_map: toBase64(treasureMap.toBytes()),
      retrieval_kits: retrievalKits.map((rk) => toBase64(rk.toBytes())),
      alice_verifying_key: toHexString(aliceVerifyingKey.toBytes()),
      bob_encrypting_key: toHexString(bobEncryptingKey.toBytes()),
      bob_verifying_key: toHexString(bobVerifyingKey.toBytes()),
    };
    const resp: AxiosResponse<PostRetrieveCFragsResult> = await axios.post(
      `${this.porterUri}/retrieve_cfrags`,
      data
    );
    return resp.data.result.retrieval_results
      .map((result) => result.cfrags)
      .map((cFrags) => {
        const parsed = Object.keys(cFrags).map((address) => [
          address,
          CapsuleFrag.fromBytes(fromBase64(cFrags[address])),
        ]);
        return Object.fromEntries(parsed);
      });
  }
}
