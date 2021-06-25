import axios, { AxiosResponse } from 'axios';

import {
  PrePublishedTreasureMap,
  PublishedTreasureMap,
} from '../policies/collections';
import {
  Base64EncodedBytes,
  ChecksumAddress,
  HexEncodedBytes,
  UmbralPublicKey,
} from '../types';

export interface IUrsula {
  checksumAddress: ChecksumAddress;
  uri: string;
  encryptingKey: HexEncodedBytes;
}

interface RevocationRequest {
  ursula: ChecksumAddress;
  revocationKit: Base64EncodedBytes;
}

export interface RevocationFailure {
  ursula: ChecksumAddress;
  failure: string;
}

interface RevocationResponse {
  failedRevocations: number;
  failures: RevocationFailure[];
}

interface PublishTreasureMapRequest {
  treasure_map: HexEncodedBytes;
  bob_encrypting_key: HexEncodedBytes;
}

interface GetTreasureMapRequest {
  treasure_map_id: HexEncodedBytes;
  bob_encrypting_key: HexEncodedBytes;
}

interface GetTreasureMapResponse {
  result: {
    treasureMap: Base64EncodedBytes;
  };
}

interface GetUrsulasRequest {
  quantity: number;
  duration_periods: number;
  exclude_ursulas?: ChecksumAddress[];
  handpicked_ursulas?: ChecksumAddress[];
}

interface PorterUrsula {
  checksum_address: ChecksumAddress;
  uri: string;
  encrypting_key: HexEncodedBytes;
}

export interface GetUrsulasResponse {
  result: {
    ursulas: PorterUrsula[];
  };
  version: string;
}

export abstract class Porter {
  public static PORTER_URL = 'https://example.com/porter/api';

  public static async getUrsulas(
    quantity: number = 3, // TODO: Pick reasonable default
    durationPeriods: number = 7, // TODO: Pick reasonable default
    excludeUrsulas?: ChecksumAddress[],
    handpickedUrsulas?: ChecksumAddress[]
  ): Promise<IUrsula[]> {
    const data: GetUrsulasRequest = {
      quantity,
      duration_periods: durationPeriods,
      exclude_ursulas: excludeUrsulas,
      handpicked_ursulas: handpickedUrsulas,
    };
    const resp: AxiosResponse<GetUrsulasResponse> = await axios.get(
      `${this.PORTER_URL}/get_ursulas`,
      { data }
    );
    return resp.data.result.ursulas.map((u: PorterUrsula) => ({
      checksumAddress: u.checksum_address,
      uri: u.uri,
      encryptingKey: u.encrypting_key,
    }));
  }

  public static publishTreasureMap(
    treasureMap: PrePublishedTreasureMap,
    bobEncryptingKey: UmbralPublicKey
  ) {
    const data: PublishTreasureMapRequest = {
      treasure_map: treasureMap.payload.toString('base64'),
      bob_encrypting_key: Buffer.from(bobEncryptingKey.toString()).toString(
        'hex'
      ),
    };
    axios.post(`${this.PORTER_URL}/publish_treasure_map`, { data });
  }

  public static revoke(revocations: RevocationRequest[]): RevocationResponse {
    throw new Error('Method not implemented.');
  }

  public static async getTreasureMap(
    treasureMapId: string,
    bobEncryptingKey: UmbralPublicKey
  ): Promise<PublishedTreasureMap> {
    const data: GetTreasureMapRequest = {
      treasure_map_id: Buffer.from(treasureMapId).toString('hex'),
      bob_encrypting_key: Buffer.from(bobEncryptingKey.toBytes()).toString(
        'hex'
      ),
    };
    const resp: AxiosResponse<GetTreasureMapResponse> = await axios.get(
      `${this.PORTER_URL}/get_treasure_map`,
      { data }
    );
    const asBytes = Buffer.from(resp.data.result.treasureMap, 'base64');
    return PublishedTreasureMap.fromBytes(asBytes);
  }

  // /exec_work_order
  public static executeWorkOrder(
    ursula: ChecksumAddress,
    workOrder: Base64EncodedBytes
  ): Base64EncodedBytes {
    throw new Error('Method not implemented.');
  }
}
