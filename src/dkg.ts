import { DkgPublicKey, DkgPublicParameters } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { bytesEquals } from './utils';

// TOOD: Move to nucypher-core
export enum FerveoVariant {
  Simple = 0,
  Precomputed = 1,
}

export interface DkgRitualJSON {
  id: number;
  dkgPublicKey: Uint8Array;
  dkgPublicParams: Uint8Array;
}

export class DkgRitual {
  constructor(
    public readonly id: number,
    public readonly dkgPublicKey: DkgPublicKey,
    public readonly dkgPublicParams: DkgPublicParameters
  ) {}

  public toObj(): DkgRitualJSON {
    return {
      id: this.id,
      dkgPublicKey: this.dkgPublicKey.toBytes(),
      dkgPublicParams: this.dkgPublicParams.toBytes(),
    };
  }

  public static fromObj(json: DkgRitualJSON): DkgRitual {
    return new DkgRitual(
      json.id,
      DkgPublicKey.fromBytes(json.dkgPublicKey),
      DkgPublicParameters.fromBytes(json.dkgPublicParams)
    );
  }

  public equals(other: DkgRitual): boolean {
    return (
      this.id === other.id &&
      bytesEquals(this.dkgPublicKey.toBytes(), other.dkgPublicKey.toBytes()) &&
      bytesEquals(
        this.dkgPublicParams.toBytes(),
        other.dkgPublicParams.toBytes()
      )
    );
  }
}

export class DkgClient {
  constructor(private readonly provider: ethers.providers.Web3Provider) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async initializeRitual(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _provider: ethers.providers.Web3Provider,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ritualParams: unknown
  ): Promise<DkgRitual> {
    // TODO: Remove this check after implementing this method
    if (!this.provider._isProvider) {
      throw new Error('Invalid provider');
    }
    // TODO: Create a new DKG ritual here
    throw new Error('Not implemented');
  }
  // TODO: Without Validator public key in Coordinator, we cannot verify the
  //    transcript. We need to add it to the Coordinator.
  // public async verifyRitual(ritualId: number): Promise<boolean> {
  //   const ritual = await DkgCoordinatorAgent.getRitual(this.provider, ritualId);
  //   const participants = await DkgCoordinatorAgent.getParticipants(
  //     this.provider,
  //     ritualId
  //   );
  //
  //   const validatorMessages = participants.map((p) => {
  //     const validatorAddress = EthereumAddress.fromString(p.provider);
  //     const publicKey = FerveoPublicKey.fromBytes(fromHexString(p.???));
  //     const validator = new Validator(validatorAddress, publicKey);
  //     const transcript = Transcript.fromBytes(fromHexString(p.transcript));
  //     return new ValidatorMessage(validator, transcript);
  //   });
  //   const aggregate = new AggregatedTranscript(validatorMessages);
  //
  //   return aggregate.verify(ritual.dkgSize, validatorMessages);
  // }
}
