import {
  AggregatedTranscript,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  DkgPublicKey,
  EthereumAddress,
  FerveoPublicKey,
  SharedSecret,
  Validator,
  ValidatorMessage,
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
  // TODO: Update API: Replace with getExistingRitual and support ritualId in Strategy
  public static async initializeRitual(
    web3Provider: ethers.providers.Web3Provider,
    ritualParams: {
      shares: number;
      threshold: number;
    }
  ): Promise<DkgRitual> {
    const ritualId = 2;
    const ritual = await DkgCoordinatorAgent.getRitual(web3Provider, ritualId);
    const dkgPkBytes = new Uint8Array([
      ...fromHexString(ritual.publicKey.word0),
      ...fromHexString(ritual.publicKey.word1),
    ]);

    return {
      id: ritualId,
      dkgPublicKey: DkgPublicKey.fromBytes(dkgPkBytes),
      threshold: ritualParams.threshold,
    } as DkgRitual;
  }

  public static async verifyRitual(
    web3Provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<boolean> {
    const ritual = await DkgCoordinatorAgent.getRitual(web3Provider, ritualId);
    const participants = await DkgCoordinatorAgent.getParticipants(
      web3Provider,
      ritualId
    );

    // TODO: Does this check make sense here? Or do we delegate it to the Coordinator contract?
    // for (const p of participants) {
    //   // Not every participant has submitted a transcript
    //   if (!p.aggregated) {
    //     return false;
    //   }
    // }

    const validatorMessages = participants.map((p) => {
      const validatorAddress = EthereumAddress.fromString(p.provider);
      // TODO: Replace with real keys
      // const publicKey = FerveoPublicKey.fromBytes(fromHexString(p.???));
      const publicKey = DkgClient.getParticipantPublicKey(p.provider);
      const validator = new Validator(validatorAddress, publicKey);
      return new ValidatorMessage(validator, p.transcript);
    });
    const aggregate = new AggregatedTranscript(validatorMessages);

    return aggregate.verify(ritual.dkgSize, validatorMessages);
  }

  public static getParticipantPublicKey = (address: string) => {
    // TODO: Without Validator public key in Coordinator, we cannot verify the
    //    transcript. We need to add it to the Coordinator (nucypher-contracts #77).
    const participantPublicKeys: Record<string, FerveoPublicKey> = {
      '0x210eeAC07542F815ebB6FD6689637D8cA2689392': FerveoPublicKey.fromBytes(
        fromHexString(
          '6000000000000000ace9d7567b26dafc512b2303cfdaa872850c62b100078ddeaabf8408c7308b3a43dfeb88375c21ef63230fb4008ce7e908764463c6765e556f9b03009eb1757d179eaa26bf875332807cc070d62a385ed2e66e09f4f4766451da12779a09036e'
        )
      ),
      '0xb15d5A4e2be34f4bE154A1b08a94Ab920FfD8A41': FerveoPublicKey.fromBytes(
        fromHexString(
          '60000000000000008b373fdb6b43e9dca028bd603c2bf90f0e008ec83ff217a8d7bc006b585570e6ab1ce761bad0e21c1aed1363286145f61134ed0ab53f4ebaa05036396c57f6e587f33d49667c1003cd03b71ad651b09dd4791bc631eaef93f1b313bbee7bd63a'
        )
      ),
    };

    const publicKey = participantPublicKeys[address];
    if (!publicKey) {
      throw new Error(`No public key for participant: ${address}`);
    }
    return publicKey;
  };
}
