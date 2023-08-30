import { SessionStaticKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import {
  Coordinator,
  Coordinator__factory,
} from '../../types/ethers-contracts';
import { BLS12381 } from '../../types/ethers-contracts/Coordinator';
import { ChecksumAddress } from '../types';
import { fromHexString } from '../utils';

import { DEFAULT_WAIT_N_CONFIRMATIONS, getContract } from './contracts';

export interface CoordinatorRitual {
  initiator: string;
  dkgSize: number;
  initTimestamp: number;
  totalTranscripts: number;
  totalAggregations: number;
  publicKey: BLS12381.G1PointStructOutput;
  aggregationMismatch: boolean;
  aggregatedTranscript: string;
}

export type DkgParticipant = {
  provider: string;
  aggregated: boolean;
  decryptionRequestStaticKey: SessionStaticKey;
};

export enum DkgRitualState {
  NON_INITIATED,
  AWAITING_TRANSCRIPTS,
  AWAITING_AGGREGATIONS,
  TIMEOUT,
  INVALID,
  FINALIZED,
}

export class DkgCoordinatorAgent {
  public static async getParticipants(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<DkgParticipant[]> {
    const Coordinator = await this.connectReadOnly(provider);
    const participants = await Coordinator.getParticipants(ritualId);

    return participants.map((participant) => {
      return {
        provider: participant.provider,
        aggregated: participant.aggregated,
        decryptionRequestStaticKey: SessionStaticKey.fromBytes(
          fromHexString(participant.decryptionRequestStaticKey)
        ),
      };
    });
  }

  public static async initializeRitual(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    providers: ChecksumAddress[]
  ): Promise<number> {
    const Coordinator = await this.connectReadWrite(provider, signer);
    const tx = await Coordinator.initiateRitual(providers);
    const txReceipt = await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    const [ritualStartEvent] = txReceipt.events ?? [];
    if (!ritualStartEvent) {
      throw new Error('Ritual start event not found');
    }
    return ritualStartEvent.args?.ritualId;
  }

  public static async getRitual(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<CoordinatorRitual> {
    const Coordinator = await this.connectReadOnly(provider);
    return Coordinator.rituals(ritualId);
  }

  public static async getRitualState(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<DkgRitualState> {
    const Coordinator = await this.connectReadOnly(provider);
    return await Coordinator.getRitualState(ritualId);
  }

  public static async onRitualEndEvent(
    provider: ethers.providers.Provider,
    ritualId: number,
    callback: (successful: boolean) => void
  ): Promise<void> {
    const Coordinator = await this.connectReadOnly(provider);
    // We leave `initiator` undefined because we don't care who the initiator is
    // We leave `successful` undefined because we don't care if the ritual was successful
    const eventFilter = Coordinator.filters.EndRitual(
      ritualId,
      undefined,
      undefined
    );
    Coordinator.once(eventFilter, (_ritualId, _initiator, successful) => {
      callback(successful);
    });
  }

  private static async connectReadOnly(provider: ethers.providers.Provider) {
    return await this.connect(provider);
  }

  private static async connectReadWrite(
    provider: ethers.providers.Provider,
    signer: ethers.Signer
  ) {
    return await this.connect(provider, signer);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    signer?: ethers.Signer
  ): Promise<Coordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(network.chainId, 'COORDINATOR');
    return Coordinator__factory.connect(contractAddress, signer ?? provider);
  }
}
