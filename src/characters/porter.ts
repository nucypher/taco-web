import {
  CapsuleFrag,
  PublicKey,
  RetrievalKit,
  ThresholdDecryptionRequest,
  ThresholdDecryptionResponse,
  TreasureMap,
} from '@nucypher/nucypher-core';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';

import { ConditionContext } from '../conditions';
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
  readonly context?: string;
};

type PostRetrieveCFragsResult = {
  readonly result: {
    readonly retrieval_results: readonly {
      readonly cfrags: {
        readonly [address: string]: string;
      };
      readonly errors: {
        readonly [key: string]: string;
      };
    }[];
  };
  readonly version: string;
};

export type RetrieveCFragsResponse = {
  cFrags: Record<ChecksumAddress, CapsuleFrag>;
  errors: Record<ChecksumAddress, string>;
};

type PostDecryptRequest = Uint8Array;

type PostDecryptResult = Uint8Array;

export class Porter {
  readonly porterUrl: URL;

  constructor(porterUri: string) {
    this.porterUrl = new URL(porterUri);
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
      new URL('/get_ursulas', this.porterUrl).toString(),
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
      encryptingKey: PublicKey.fromCompressedBytes(
        fromHexString(u.encrypting_key)
      ),
    }));
  }

  public async retrieveCFrags(
    treasureMap: TreasureMap,
    retrievalKits: readonly RetrievalKit[],
    aliceVerifyingKey: PublicKey,
    bobEncryptingKey: PublicKey,
    bobVerifyingKey: PublicKey,
    conditionsContext?: ConditionContext
  ): Promise<readonly RetrieveCFragsResponse[]> {
    const context = conditionsContext
      ? await conditionsContext.toJson()
      : undefined;
    const data: PostRetrieveCFragsRequest = {
      treasure_map: toBase64(treasureMap.toBytes()),
      retrieval_kits: retrievalKits.map((rk) => toBase64(rk.toBytes())),
      alice_verifying_key: toHexString(aliceVerifyingKey.toCompressedBytes()),
      bob_encrypting_key: toHexString(bobEncryptingKey.toCompressedBytes()),
      bob_verifying_key: toHexString(bobVerifyingKey.toCompressedBytes()),
      context,
    };
    const resp: AxiosResponse<PostRetrieveCFragsResult> = await axios.post(
      new URL('/retrieve_cfrags', this.porterUrl).toString(),
      data
    );

    return resp.data.result.retrieval_results.map(({ cfrags, errors }) => {
      const parsed = Object.keys(cfrags).map((address) => [
        address,
        CapsuleFrag.fromBytes(fromBase64(cfrags[address])),
      ]);
      const cFrags = Object.fromEntries(parsed);
      return { cFrags, errors };
    });
  }

  public async decrypt(
    tDecRequest: ThresholdDecryptionRequest
  ): Promise<ThresholdDecryptionResponse[]> {
    const data: PostDecryptRequest = tDecRequest.toBytes();
    const resp: AxiosResponse<PostDecryptResult> = await axios.post(
      new URL('/decrypt', this.porterUrl).toString(),
      data
    );
    // TODO: In /cbd_decrypt, the response is a list of ThresholdDecryptionResponse
    return [ThresholdDecryptionResponse.fromBytes(resp.data)];
  }
}
