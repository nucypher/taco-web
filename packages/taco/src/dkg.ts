import { DkgPublicKey } from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  DkgRitualState,
  Domain,
  fromHexString,
  toPublicClient,
} from '@nucypher/shared';
import { BigNumberish } from 'ethers';
import { PublicClient, WalletClient } from 'viem';

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

const ERR_RITUAL_NOT_FINALIZED = (ritualId: number, ritual: DkgRitual) =>
  `Ritual ${ritualId} is not finalized. State: ${ritual.state}`;

export class DkgClient {
  public static async initializeRitual(
    walletClient: WalletClient,
    domain: Domain,
    ursulas: ChecksumAddress[],
    authority: string,
    duration: BigNumberish,
    accessController: string,
    waitUntilEnd = false,
  ): Promise<number | undefined> {
    const publicClient = toPublicClient(walletClient);
    const ritualId = await DkgCoordinatorAgent.initializeRitual(
      walletClient,
      domain,
      ursulas.sort(), // Contract call requires sorted addresses
      authority,
      duration,
      accessController,
    );

    if (waitUntilEnd) {
      const isSuccessful = await DkgClient.waitUntilRitualEnd(
        publicClient,
        domain,
        ritualId,
      );
      if (!isSuccessful) {
        const ritualState = await DkgCoordinatorAgent.getRitualState(
          publicClient,
          domain,
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
    publicClient: PublicClient,
    domain: Domain,
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
      DkgCoordinatorAgent.onRitualEndEvent(
        publicClient,
        domain,
        ritualId,
        callback,
      );
    });
  };

  public static async getRitual(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgRitual> {
    const ritualState = await DkgCoordinatorAgent.getRitualState(
      publicClient,
      domain,
      ritualId,
    );
    const ritual = await DkgCoordinatorAgent.getRitual(
      publicClient,
      domain,
      ritualId,
    );
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

  public static async getActiveRitual(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgRitual> {
    const ritual = await DkgClient.getRitual(publicClient, domain, ritualId);
    if (ritual.state !== DkgRitualState.ACTIVE) {
      throw new Error(ERR_RITUAL_NOT_FINALIZED(ritualId, ritual));
    }
    return ritual;
  }

  // TODO: Without Validator public key in Coordinator, we cannot verify the
  //    transcript. We need to add it to the Coordinator (nucypher-contracts #77).
  // public async verifyRitual(ritualId: number): Promise<boolean> {
  //   const ritual = await DkgCoordinatorAgent.getRitual(this.publicClient, ritualId);
  //   const participants = await DkgCoordinatorAgent.getParticipants(
  //     this.publicClient,
  //     ritualId
  //   );
  //
  //   const validatorMessages = participants.map((p) => {
  //     const validatorAddress = EthereumAddress.fromString(p.publicClient);
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
