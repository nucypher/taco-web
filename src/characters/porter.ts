import { ChecksumAddress, Base64EncodedBytes, HexEncodedBytes, UmbralPublicKey } from '../types';

export interface Ursula {
  checksum_address: ChecksumAddress;
  ip_address: string;
  encrypting_key: HexEncodedBytes;
}

export interface RevocationRequestDto {
  ursula: ChecksumAddress;
  revocationKit: Base64EncodedBytes;
}

export interface RevocationFailureDto {
  ursula: ChecksumAddress;
  failure: string;
}

export interface RevocationResultDto {
  failedRevocations: number;
  failures: RevocationFailureDto[];
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
    treasureMap: Base64EncodedBytes,
    bobEncryptingKey: UmbralPublicKey
  ) {
    throw new Error('Method not implemented.');
  }

  // /revoke
  public static revoke(
    revocations: RevocationRequestDto[]
  ): RevocationResultDto {
    throw new Error('Method not implemented.');
  }

  // https://github.com/nucypher/nucypher/issues/2704

  // /get_treasure_map
  public static getTreasureMap(
    treasureMapId: HexEncodedBytes,
    bobEncryptingKey: HexEncodedBytes
  ): Base64EncodedBytes {
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
