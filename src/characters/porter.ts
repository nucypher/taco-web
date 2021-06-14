import {
  ChecksumAddress,
  Base64EncodedBytes,
  HexEncodedBytes,
  UmbralPublicKey,
  TreasureMap,
} from '../types';

export interface Ursula {
  checksum_address: ChecksumAddress;
  ip_address: string;
  encrypting_key: HexEncodedBytes;
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
  treasureMap: HexEncodedBytes;
  bobEncryptingKey: HexEncodedBytes;
}

interface GetTreasureMapRequest {
  treasureMapId: HexEncodedBytes;
  bobEncryptingKey: HexEncodedBytes;
}

export abstract class Porter {
  // https://github.com/nucypher/nucypher/issues/2703

  // /get_ursulas
  public static getUrsulas(
    quantity: number,
    durationPeriods: number,
    excludeUrsulas?: ChecksumAddress[],
    handpickedUrsulas?: ChecksumAddress[]
  ): Ursula[] {
    throw new Error('Method not implemented.');
  }

  // /publish_treasure_map
  public static publishTreasureMap(
    treasureMap: TreasureMap,
    bobEncryptingKey: UmbralPublicKey
  ) {
    const request: PublishTreasureMapRequest = {
      treasureMap: treasureMap.toBytes().toString('base64'),
      bobEncryptingKey: Buffer.from(bobEncryptingKey.toString()).toString(
        'hex'
      ),
    };
    throw new Error('Method not implemented.');
  }

  // /revoke
  public static revoke(revocations: RevocationRequest[]): RevocationResponse {
    throw new Error('Method not implemented.');
  }

  // https://github.com/nucypher/nucypher/issues/2704

  // /get_treasure_map
  public static getTreasureMap(
    treasureMapId: string,
    bobEncryptingKey: UmbralPublicKey
  ): Base64EncodedBytes {
    const request: GetTreasureMapRequest = {
      treasureMapId: Buffer.from(treasureMapId).toString('hex'),
      bobEncryptingKey: Buffer.from(bobEncryptingKey.toBytes()).toString('hex'),
    };
    throw new Error('Method not implemented.');
  }

  // /exec_work_order
  public static executeWorkOrder(
    ursula: ChecksumAddress,
    workOrder: Base64EncodedBytes
  ): Base64EncodedBytes {
    throw new Error('Method not implemented.');
  }
}
