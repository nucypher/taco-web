import axios, { AxiosResponse } from 'axios';
import { PublicKey } from 'umbral-pre';

import { PolicyMessageKit } from '../kits/message';
import {
  PrePublishedTreasureMap,
  PublishedTreasureMap,
  WorkOrder,
  WorkOrderResult,
} from '../policies/collections';
import { Arrangement } from '../policies/policy';
import { Base64EncodedBytes, ChecksumAddress, HexEncodedBytes } from '../types';
import { fromBase64, toBase64, toBytes, toHexString } from '../utils';

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

export interface RevocationResponse {
  failedRevocations: number;
  failures: RevocationFailure[];
}

export interface PublishTreasureMapRequest {
  treasure_map: HexEncodedBytes;
  bob_encrypting_key: HexEncodedBytes;
}

export interface GetTreasureMapRequest {
  treasure_map_id: HexEncodedBytes;
  bob_encrypting_key: HexEncodedBytes;
}

export interface GetTreasureMapResponse {
  result: {
    treasureMap: Base64EncodedBytes;
  };
}

export interface GetUrsulasRequest {
  quantity: number;
  duration_periods: number;
  exclude_ursulas?: ChecksumAddress[];
  handpicked_ursulas?: ChecksumAddress[];
}

export interface PorterUrsula {
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

export interface PostExecuteWorkOrderRequest {
  ursula: ChecksumAddress;
  work_order: Base64EncodedBytes;
}

export interface PostExecuteWorkOrderResult {
  work_order_result: Base64EncodedBytes;
}

export class Porter {
  private readonly porterUri: string;

  constructor(porterUri: string) {
    this.porterUri = porterUri;
  }

  public async getUrsulas(
    quantity = 3, // TODO: Pick reasonable default
    durationPeriods = 7, // TODO: Pick reasonable default
    excludeUrsulas?: ChecksumAddress[],
    handpickedUrsulas?: ChecksumAddress[]
  ): Promise<IUrsula[]> {
    const params: GetUrsulasRequest = {
      quantity,
      duration_periods: durationPeriods,
      exclude_ursulas: excludeUrsulas,
      handpicked_ursulas: handpickedUrsulas,
    };
    const resp: AxiosResponse<GetUrsulasResponse> = await axios.get(
      `${this.porterUri}/get_ursulas`,
      { params }
    );
    return resp.data.result.ursulas.map((u: PorterUrsula) => ({
      checksumAddress: u.checksum_address,
      uri: u.uri,
      encryptingKey: u.encrypting_key,
    }));
  }

  public async publishTreasureMap(
    treasureMap: PrePublishedTreasureMap,
    bobEncryptingKey: PublicKey
  ) {
    const data: PublishTreasureMapRequest = {
      treasure_map: toBase64(treasureMap.payload),
      bob_encrypting_key: toHexString(bobEncryptingKey.toBytes()),
    };
    await axios.post(`${this.porterUri}/publish_treasure_map`, data);
  }

  public revoke(revocations: RevocationRequest[]): RevocationResponse {
    throw new Error('Method not implemented.');
  }

  public async getTreasureMap(
    treasureMapId: string,
    bobEncryptingKey: PublicKey
  ): Promise<PublishedTreasureMap> {
    const params: GetTreasureMapRequest = {
      treasure_map_id: toHexString(toBytes(treasureMapId)),
      bob_encrypting_key: toHexString(bobEncryptingKey.toBytes()),
    };
    const resp: AxiosResponse<GetTreasureMapResponse> = await axios.get(
      `${this.porterUri}/get_treasure_map`,
      { params }
    );
    const asBytes = fromBase64(resp.data.result.treasureMap);
    return PublishedTreasureMap.fromBytes(asBytes);
  }

  public async executeWorkOrder(workOrder: WorkOrder): Promise<WorkOrderResult> {
    const data: PostExecuteWorkOrderRequest = {
      ursula: workOrder.ursula.checksumAddress,
      work_order: toBase64(workOrder.payload()),
    };
    const resp: AxiosResponse<PostExecuteWorkOrderResult> = await axios.post(
      `${this.porterUri}/exec_work_order`,
      { data }
    );
    const asBytes = fromBase64(resp.data.work_order_result);
    return WorkOrderResult.fromBytes(asBytes);
  }

  public async proposeArrangement(
    ursula: IUrsula,
    arrangement: Arrangement
  ): Promise<ChecksumAddress | null> {
    const url = `${this.porterUri}/proxy/consider_arrangement`;
    const config = {
      headers: {
        'X-PROXY-DESTINATION': ursula.uri,
        'Content-Type': 'application/octet-stream',
      },
    };
    await axios.post(url, arrangement.toBytes(), config).catch(() => {
      return null;
    });
    return ursula.checksumAddress;
  }

  public async enactPolicy(
    ursula: IUrsula,
    arrangementId: Uint8Array,
    messageKit: PolicyMessageKit
  ): Promise<ChecksumAddress | null> {
    const kFragId = toHexString(arrangementId);
    const url = `${this.porterUri}/proxy/kFrag/${kFragId}`;
    const config = {
      headers: {
        'X-PROXY-DESTINATION': ursula.uri,
        'Content-Type': 'application/octet-stream',
      },
    };
    await axios.post(url, messageKit.toBytes(), config).catch(() => {
      return null;
    });
    return ursula.checksumAddress;
  }
}
