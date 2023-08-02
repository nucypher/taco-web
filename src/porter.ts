import {
  CapsuleFrag,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  PublicKey,
  RetrievalKit,
  TreasureMap,
} from '@nucypher/nucypher-core';
import axios, { AxiosResponse } from 'axios';
import qs from 'qs';

import { Base64EncodedBytes, ChecksumAddress, HexEncodedBytes } from './types';
import { fromBase64, fromHexString, toBase64, toHexString } from './utils';

type Network = 'mainnet' | 'tapir' | 'oryx' | 'lynx';

const PORTER_URIS: Record<Network, string> = {
  mainnet: 'https://porter.nucypher.community',
  tapir: 'https://porter-tapir.nucypher.community',
  oryx: 'https://porter-oryx.nucypher.community',
  lynx: 'https://porter-lynx.nucypher.community',
};

export const getPorterUri = (network: Network): string => {
  const uri = PORTER_URIS[network];
  if (!uri) {
    throw new Error(`No default Porter URI found for network: ${network}`);
  }
  return PORTER_URIS[network];
};

// /get_ursulas

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

export type GetUrsulasResult = {
  readonly result: {
    readonly ursulas: readonly UrsulaResponse[];
  };
  readonly version: string;
};

// /retrieve_cfrags

type PostRetrieveCFragsRequest = {
  readonly treasure_map: Base64EncodedBytes;
  readonly retrieval_kits: readonly Base64EncodedBytes[];
  readonly alice_verifying_key: HexEncodedBytes;
  readonly bob_encrypting_key: HexEncodedBytes;
  readonly bob_verifying_key: HexEncodedBytes;
  readonly context?: string;
};

type PostRetrieveCFragsResponse = {
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

export type RetrieveCFragsResult = {
  readonly cFrags: Record<ChecksumAddress, CapsuleFrag>;
  readonly errors: Record<ChecksumAddress, string>;
};

// /cbd_decrypt

type PostCbdDecryptRequest = {
  readonly threshold: number;
  readonly encrypted_decryption_requests: Record<
    ChecksumAddress,
    Base64EncodedBytes
  >;
};

type PostCbdDecryptResponse = {
  result: {
    decryption_results: {
      encrypted_decryption_responses: Record<
        ChecksumAddress,
        Base64EncodedBytes
      >;
      errors: Record<ChecksumAddress, string>;
    };
  };
};

export type CbdDecryptResult = {
  encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>;
  errors: Record<string, string>;
};

export class PorterClient {
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
    const resp: AxiosResponse<GetUrsulasResult> = await axios.get(
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
    conditionContextJSON?: string | undefined
  ): Promise<readonly RetrieveCFragsResult[]> {
    const data: PostRetrieveCFragsRequest = {
      treasure_map: toBase64(treasureMap.toBytes()),
      retrieval_kits: retrievalKits.map((rk) => toBase64(rk.toBytes())),
      alice_verifying_key: toHexString(aliceVerifyingKey.toCompressedBytes()),
      bob_encrypting_key: toHexString(bobEncryptingKey.toCompressedBytes()),
      bob_verifying_key: toHexString(bobVerifyingKey.toCompressedBytes()),
      context: conditionContextJSON,
    };
    const resp: AxiosResponse<PostRetrieveCFragsResponse> = await axios.post(
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

  public async cbdDecrypt(
    encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>,
    threshold: number
  ): Promise<CbdDecryptResult> {
    const data: PostCbdDecryptRequest = {
      encrypted_decryption_requests: Object.fromEntries(
        Object.entries(encryptedRequests).map(([ursula, encryptedRequest]) => [
          ursula,
          toBase64(encryptedRequest.toBytes()),
        ])
      ),
      threshold,
    };
    const resp: AxiosResponse<PostCbdDecryptResponse> = await axios.post(
      new URL('/cbd_decrypt', this.porterUrl).toString(),
      data
    );

    const { encrypted_decryption_responses, errors } =
      resp.data.result.decryption_results;

    const decryptionResponses = Object.entries(
      encrypted_decryption_responses
    ).map(([address, encryptedResponseBase64]) => {
      const encryptedResponse = EncryptedThresholdDecryptionResponse.fromBytes(
        fromBase64(encryptedResponseBase64)
      );
      return [address, encryptedResponse];
    });
    const encryptedResponses: Record<
      string,
      EncryptedThresholdDecryptionResponse
    > = Object.fromEntries(decryptionResponses);
    return { encryptedResponses, errors };
  }
}
