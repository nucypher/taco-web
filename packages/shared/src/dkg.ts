import { DkgPublicKey } from '@nucypher/nucypher-core';
import { BigNumberish, ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgRitualState } from './contracts';
import { ChecksumAddress } from './types';
import { fromHexString } from './utils';

export interface DkgRitualJSON {
  id: number;
  dkgPublicKey: Uint8Array;
  sharesNum: number;
  threshold: number;
  state: DkgRitualState;
}

export class DkgRitual {
  constructor(
    public readonly id: number,
    public readonly dkgPublicKey: DkgPublicKey,
    public readonly sharesNum: number,
    public readonly threshold: number,
    public readonly state: DkgRitualState,
  ) {}

  public toObj(): DkgRitualJSON {
    return {
      id: this.id,
      dkgPublicKey: this.dkgPublicKey.toBytes(),
      sharesNum: this.sharesNum,
      threshold: this.threshold,
      state: this.state,
    };
  }

  public static fromObj({
    id,
    dkgPublicKey,
    sharesNum,
    threshold,
    state,
  }: DkgRitualJSON): DkgRitual {
    return new DkgRitual(
      id,
      DkgPublicKey.fromBytes(dkgPublicKey),
      sharesNum,
      threshold,
      state,
    );
  }

  public equals(other: DkgRitual): boolean {
    return [
      this.id === other.id,
      this.dkgPublicKey.equals(other.dkgPublicKey),
      this.sharesNum === other.sharesNum,
      this.threshold === other.threshold,
      this.state === other.state,
    ].every(Boolean);
  }
}

export class DkgClient {
  public static async initializeRitual(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    ursulas: ChecksumAddress[],
    authority: string,
    duration: BigNumberish,
    accessController: string,
    waitUntilEnd = false,
  ): Promise<number | undefined> {
    const ritualId = await DkgCoordinatorAgent.initializeRitual(
      provider,
      signer,
      ursulas.sort(),
      authority,
      duration,
      accessController,
    );

    if (waitUntilEnd) {
      const isSuccessful = await DkgClient.waitUntilRitualEnd(
        provider,
        ritualId,
      );
      if (!isSuccessful) {
        const ritualState = await DkgCoordinatorAgent.getRitualState(
          provider,
          ritualId,
        );
        throw new Error(
          `Ritual initialization failed. Ritual id ${ritualId} is in state ${ritualState}`,
        );
      }
    }

    return ritualId;
  }

  private static waitUntilRitualEnd = async (
    provider: ethers.providers.Provider,
    ritualId: number,
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

  public static async getRitual(
    provider: ethers.providers.Provider,
    ritualId: number,
  ): Promise<DkgRitual> {
    const ritualState = await DkgCoordinatorAgent.getRitualState(
      provider,
      ritualId,
    );
    const ritual = await DkgCoordinatorAgent.getRitual(provider, ritualId);
    const dkgPkBytes = new Uint8Array([
      ...fromHexString(ritual.publicKey.word0),
      ...fromHexString(ritual.publicKey.word1),
    ]);
    return new DkgRitual(
      ritualId,
      DkgPublicKey.fromBytes(dkgPkBytes),
      ritual.dkgSize,
      ritual.threshold,
      ritualState,
    );
  }

  public static async getFinalizedRitual(
    provider: ethers.providers.Provider,
    ritualId: number,
  ): Promise<DkgRitual> {
    const ritual = await DkgClient.getRitual(provider, ritualId);
    if (ritual.state !== DkgRitualState.FINALIZED) {
      throw new Error(
        `Ritual ${ritualId} is not finalized. State: ${ritual.state}`,
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
