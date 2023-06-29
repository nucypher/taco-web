import {
  AggregatedTranscript,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  DkgPublicKey,
  EthereumAddress,
  FerveoPublicKey,
  FerveoVariant,
  SharedSecret,
  Validator,
  ValidatorMessage,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgRitualState } from './agents/coordinator';
import { ChecksumAddress } from './types';
import { fromHexString, objectEquals } from './utils';

export function getVariantClass(
  variant: FerveoVariant
): typeof DecryptionShareSimple | typeof DecryptionSharePrecomputed {
  if (variant.equals(FerveoVariant.simple)) {
    return DecryptionShareSimple;
  } else if (variant.equals(FerveoVariant.precomputed)) {
    return DecryptionSharePrecomputed;
  } else {
    throw new Error(`Invalid FerveoVariant: ${variant}`);
  }
}

export function getCombineDecryptionSharesFunction(
  variant: FerveoVariant
): (
  shares: DecryptionShareSimple[] | DecryptionSharePrecomputed[]
) => SharedSecret {
  if (variant.equals(FerveoVariant.simple)) {
    return combineDecryptionSharesSimple;
  } else if (variant.equals(FerveoVariant.precomputed)) {
    return combineDecryptionSharesPrecomputed;
  } else {
    throw new Error(`Invalid FerveoVariant: ${variant}`);
  }
}

export type DkgRitualParameters = {
  sharesNum: number;
  threshold: number;
};

export interface DkgRitualJSON {
  id: number;
  dkgPublicKey: Uint8Array;
  dkgParams: DkgRitualParameters;
  state: DkgRitualState;
}

export class DkgRitual {
  constructor(
    public readonly id: number,
    public readonly dkgPublicKey: DkgPublicKey,
    public readonly dkgParams: DkgRitualParameters,
    public readonly state: DkgRitualState
  ) {}

  public toObj(): DkgRitualJSON {
    return {
      id: this.id,
      dkgPublicKey: this.dkgPublicKey.toBytes(),
      dkgParams: this.dkgParams,
      state: this.state,
    };
  }

  public static fromObj({
    id,
    dkgPublicKey,
    dkgParams,
    state,
  }: DkgRitualJSON): DkgRitual {
    return new DkgRitual(
      id,
      DkgPublicKey.fromBytes(dkgPublicKey),
      dkgParams,
      state
    );
  }

  public equals(other: DkgRitual): boolean {
    return [
      this.id === other.id,
      this.dkgPublicKey.equals(other.dkgPublicKey),
      objectEquals(this.dkgParams, other.dkgParams),
      this.state === other.state,
    ].every(Boolean);
  }
}

// TODO: Currently, we're assuming that the threshold is always `floor(sharesNum / 2) + 1`.
//  https://github.com/nucypher/nucypher/issues/3095
const assumedThreshold = (sharesNum: number): number =>
  Math.floor(sharesNum / 2) + 1;

export class DkgClient {
  public static async initializeRitual(
    web3Provider: ethers.providers.Web3Provider,
    ursulas: ChecksumAddress[],
    waitUntilEnd = false
  ): Promise<number | undefined> {
    const ritualId = await DkgCoordinatorAgent.initializeRitual(
      web3Provider,
      ursulas.sort()
    );

    if (waitUntilEnd) {
      const isSuccessful = await DkgClient.waitUntilRitualEnd(
        web3Provider,
        ritualId
      );
      if (!isSuccessful) {
        const ritualState = await DkgCoordinatorAgent.getRitualState(
          web3Provider,
          ritualId
        );
        throw new Error(
          `Ritual initialization failed. Ritual id ${ritualId} is in state ${ritualState}`
        );
      }
    }

    return ritualId;
  }

  private static waitUntilRitualEnd = async (
    web3Provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const callback = (successful: boolean) => {
        if (successful) {
          resolve(true);
        } else {
          reject();
        }
      };
      DkgCoordinatorAgent.onRitualEndEvent(web3Provider, ritualId, callback);
    });
  };

  public static async getExistingRitual(
    web3Provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<DkgRitual> {
    const ritualState = await DkgCoordinatorAgent.getRitualState(
      web3Provider,
      ritualId
    );
    const ritual = await DkgCoordinatorAgent.getRitual(web3Provider, ritualId);
    const dkgPkBytes = new Uint8Array([
      ...fromHexString(ritual.publicKey.word0),
      ...fromHexString(ritual.publicKey.word1),
    ]);
    return new DkgRitual(
      ritualId,
      DkgPublicKey.fromBytes(dkgPkBytes),
      {
        sharesNum: ritual.dkgSize,
        threshold: assumedThreshold(ritual.dkgSize),
      },
      ritualState
    );
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
          'ace9d7567b26dafc512b2303cfdaa872850c62b100078ddeaabf8408c7308b3a43dfeb88375c21ef63230fb4008ce7e908764463c6765e556f9b03009eb1757d179eaa26bf875332807cc070d62a385ed2e66e09f4f4766451da12779a09036e'
        )
      ),
      '0xb15d5A4e2be34f4bE154A1b08a94Ab920FfD8A41': FerveoPublicKey.fromBytes(
        fromHexString(
          '8b373fdb6b43e9dca028bd603c2bf90f0e008ec83ff217a8d7bc006b585570e6ab1ce761bad0e21c1aed1363286145f61134ed0ab53f4ebaa05036396c57f6e587f33d49667c1003cd03b71ad651b09dd4791bc631eaef93f1b313bbee7bd63a'
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
