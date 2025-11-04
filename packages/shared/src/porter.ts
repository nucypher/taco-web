import {
  CapsuleFrag,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  PublicKey,
  RetrievalKit,
  TreasureMap,
} from '@nucypher/nucypher-core';
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  HttpStatusCode,
} from 'axios';
import qs from 'qs';

import { Base64EncodedBytes, ChecksumAddress, HexEncodedBytes } from './types.js';
import { fromBase64, fromHexString, toBase64, toHexString } from './utils.js';

const defaultPorterUri: Record<string, string> = {
  mainnet: 'https://porter.nucypher.io',
  tapir: 'https://porter-tapir.nucypher.io',
  lynx: 'https://porter-lynx.nucypher.io',
};

const porterUriSource: string =
  'https://raw.githubusercontent.com/nucypher/nucypher-porter/main/porter_instances.json';

export type Domain = keyof typeof defaultPorterUri;
export type PorterURISourceResponse = Record<string, string[]>;

export const domains: Record<string, Domain> = {
  DEVNET: 'lynx',
  TESTNET: 'tapir',
  MAINNET: 'mainnet',
};

export const getPorterUri = async (domain: Domain): Promise<string> => {
  return (await getPorterUris(domain))[0];
};

export const getPorterUris = async (domain: Domain): Promise<string[]> => {
  const fullList = [];
  const uri = defaultPorterUri[domain];
  if (!uri) {
    throw new Error(`No default Porter URI found for domain: ${domain}`);
  }
  fullList.push(uri);
  const urisFromSource = await getPorterUrisFromSource(domain);
  fullList.push(...urisFromSource);
  return fullList;
};

export const getPorterUrisFromSource = async (
  domain: Domain,
): Promise<string[]> => {
  const source = porterUriSource;
  if (!source) {
    return [];
  }
  try {
    const resp = await axios.get(porterUriSource, {
      responseType: 'blob',
    });
    const uris: PorterURISourceResponse = JSON.parse(resp.data);
    return uris[domain];
  } catch (e) {
    return [];
  }
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
  readonly context?: string | undefined;
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

// /decrypt

type PostTacoDecryptRequest = {
  readonly threshold: number;
  readonly encrypted_decryption_requests: Record<
    ChecksumAddress,
    Base64EncodedBytes
  >;
};

type PostTacoDecryptResponse = {
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

export type TacoDecryptResult = {
  encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>;
  errors: Record<string, string>;
};

export class PorterClient {
  readonly porterUrls: URL[];

  constructor(porterUris: string | string[]) {
    if (porterUris instanceof Array) {
      this.porterUrls = porterUris.map((uri) => new URL(uri));
    } else {
      this.porterUrls = [new URL(porterUris)];
    }
  }

  protected async tryAndCall<T, D>(
    config: AxiosRequestConfig<D>,
  ): Promise<AxiosResponse<T>> {
    let resp!: AxiosResponse<T>;
    let lastError = undefined;
    for (const porterUrl of this.porterUrls) {
      const localConfig = { ...config, baseURL: porterUrl.toString() };
      try {
        resp = await axios.request(localConfig);
        if (resp.status === HttpStatusCode.Ok) {
          return resp;
        }
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    if (lastError) {
      throw lastError;
    }
    throw new Error(
      `Porter returned bad response: ${resp.status} - ${resp.data}`,
    );
  }

  public async getUrsulas(
    quantity: number,
    excludeUrsulas: readonly ChecksumAddress[] = [],
    includeUrsulas: readonly ChecksumAddress[] = [],
  ): Promise<readonly Ursula[]> {
    const params: GetUrsulasRequest = {
      quantity,
      exclude_ursulas: excludeUrsulas,
      include_ursulas: includeUrsulas,
    };
    const resp: AxiosResponse<GetUrsulasResult> = await this.tryAndCall({
      url: '/get_ursulas',
      method: 'get',
      params: params,
      paramsSerializer: (params) => {
        return qs.stringify(params, { arrayFormat: 'comma' });
      },
    });
    return resp.data.result.ursulas.map((u: UrsulaResponse) => ({
      checksumAddress: u.checksum_address,
      uri: u.uri,
      encryptingKey: PublicKey.fromCompressedBytes(
        fromHexString(u.encrypting_key),
      ),
    }));
  }

  public async retrieveCFrags(
    treasureMap: TreasureMap,
    retrievalKits: readonly RetrievalKit[],
    aliceVerifyingKey: PublicKey,
    bobEncryptingKey: PublicKey,
    bobVerifyingKey: PublicKey,
    conditionContextJSON: string | undefined = undefined,
  ): Promise<readonly RetrieveCFragsResult[]> {
    const data: PostRetrieveCFragsRequest = {
      treasure_map: toBase64(treasureMap.toBytes()),
      retrieval_kits: retrievalKits.map((rk) => toBase64(rk.toBytes())),
      alice_verifying_key: toHexString(aliceVerifyingKey.toCompressedBytes()),
      bob_encrypting_key: toHexString(bobEncryptingKey.toCompressedBytes()),
      bob_verifying_key: toHexString(bobVerifyingKey.toCompressedBytes()),
      context: conditionContextJSON,
    };
    const resp: AxiosResponse<PostRetrieveCFragsResponse> =
      await this.tryAndCall({
        url: '/retrieve_cfrags',
        method: 'post',
        data: data,
      });

    return resp.data.result.retrieval_results.map(({ cfrags, errors }) => {
      const parsed = Object.keys(cfrags).map((address) => [
        address,
        CapsuleFrag.fromBytes(fromBase64(cfrags[address])),
      ]);
      const cFrags = Object.fromEntries(parsed);
      return { cFrags, errors };
    });
  }

  public async tacoDecrypt(
    encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>,
    threshold: number,
  ): Promise<TacoDecryptResult> {
    const data: PostTacoDecryptRequest = {
      encrypted_decryption_requests: Object.fromEntries(
        Object.entries(encryptedRequests).map(([ursula, encryptedRequest]) => [
          ursula,
          toBase64(encryptedRequest.toBytes()),
        ]),
      ),
      threshold,
    };
    const resp: AxiosResponse<PostTacoDecryptResponse> = await this.tryAndCall({
      url: '/decrypt',
      method: 'post',
      data: data,
    });

    const { encrypted_decryption_responses, errors } =
      resp.data.result.decryption_results;

    const decryptionResponses = Object.entries(
      encrypted_decryption_responses,
    ).map(([address, encryptedResponseBase64]) => {
      const encryptedResponse = EncryptedThresholdDecryptionResponse.fromBytes(
        fromBase64(encryptedResponseBase64),
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
