import { DkgPublicKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgRitualState } from './agents/coordinator';
import { ChecksumAddress } from './types';
import { fromHexString, objectEquals } from './utils';

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
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    ursulas: ChecksumAddress[],
    waitUntilEnd = false
  ): Promise<number | undefined> {
    const ritualId = await DkgCoordinatorAgent.initializeRitual(
      provider,
      signer,
      ursulas.sort()
    );

    if (waitUntilEnd) {
      const isSuccessful = await DkgClient.waitUntilRitualEnd(
        provider,
        ritualId
      );
      if (!isSuccessful) {
        const ritualState = await DkgCoordinatorAgent.getRitualState(
          provider,
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
    provider: ethers.providers.Provider,
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
      DkgCoordinatorAgent.onRitualEndEvent(provider, ritualId, callback);
    });
  };

  public static async getExistingRitual(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<DkgRitual> {
    const ritualState = await DkgCoordinatorAgent.getRitualState(
      provider,
      ritualId
    );
    const ritual = await DkgCoordinatorAgent.getRitual(provider, ritualId);
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

  public static async getFinalizedRitual(
    web3Provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<DkgRitual> {
    const ritual = await DkgClient.getExistingRitual(web3Provider, ritualId);
    if (ritual.state !== DkgRitualState.FINALIZED) {
      throw new Error(
        `Ritual ${ritualId} is not finalized. State: ${ritual.state}`
      );
    }
    return ritual;
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
