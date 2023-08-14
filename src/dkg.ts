import {
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  DkgPublicKey,
  SharedSecret,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent } from './agents/coordinator';
import { bytesEquals, fromHexString } from './utils';

// TODO: Expose from @nucypher/nucypher-core
export enum FerveoVariant {
  Simple = 0,
  Precomputed = 1,
}

export function getVariantClass(
  variant: FerveoVariant
): typeof DecryptionShareSimple | typeof DecryptionSharePrecomputed {
  switch (variant) {
    case FerveoVariant.Simple:
      return DecryptionShareSimple;
    case FerveoVariant.Precomputed:
      return DecryptionSharePrecomputed;
    default:
      throw new Error(`Invalid FerveoVariant: ${variant}`);
  }
}

export function getCombineDecryptionSharesFunction(
  variant: FerveoVariant
): (
  shares: DecryptionShareSimple[] | DecryptionSharePrecomputed[]
) => SharedSecret {
  switch (variant) {
    case FerveoVariant.Simple:
      return combineDecryptionSharesSimple;
    case FerveoVariant.Precomputed:
      return combineDecryptionSharesPrecomputed;
    default:
      throw new Error(`Invalid FerveoVariant: ${variant}`);
  }
}

export interface DkgRitualJSON {
  id: number;
  dkgPublicKey: Uint8Array;
  threshold: number;
}

export class DkgRitual {
  constructor(
    public readonly id: number,
    public readonly dkgPublicKey: DkgPublicKey,
    public readonly threshold: number
  ) {}

  public toObj(): DkgRitualJSON {
    return {
      id: this.id,
      dkgPublicKey: this.dkgPublicKey.toBytes(),
      threshold: this.threshold,
    };
  }

  public static fromObj({
    id,
    dkgPublicKey,
    threshold,
  }: DkgRitualJSON): DkgRitual {
    return new DkgRitual(id, DkgPublicKey.fromBytes(dkgPublicKey), threshold);
  }

  public equals(other: DkgRitual): boolean {
    return (
      this.id === other.id &&
      // TODO: Replace with `equals` after https://github.com/nucypher/nucypher-core/issues/56 is fixed
      bytesEquals(this.dkgPublicKey.toBytes(), other.dkgPublicKey.toBytes()) &&
      this.threshold === other.threshold
    );
  }
}

export class DkgClient {
  constructor(private readonly provider: ethers.providers.Web3Provider) {}

  public async getExistingRitual(
    ritualId: number,
    threshold: number
  ): Promise<DkgRitual> {
    const ritual = await DkgCoordinatorAgent.getRitual(this.provider, ritualId);
    const dkgPkBytes = new Uint8Array([
      ...fromHexString(ritual.publicKey.word0),
      ...fromHexString(ritual.publicKey.word1),
    ]);
    return new DkgRitual(
      ritualId,
      DkgPublicKey.fromBytes(dkgPkBytes),
      threshold
    );
  }

  // TODO: Without Validator public key in Coordinator, we cannot verify the
  //    transcript. We need to add it to the Coordinator (nucypher-contracts #77).
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
