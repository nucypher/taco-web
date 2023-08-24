import { SessionStaticKey } from '@nucypher/nucypher-core';
import { PublicClient, WalletClient } from 'viem';

import { Coordinator__factory } from '../../types/ethers-contracts';
import { BLS12381 } from '../../types/ethers-contracts/Coordinator';
import { ChecksumAddress } from '../types';
import { fromHexString } from '../utils';
import { publicClientToProvider, walletClientToSigner } from '../viem';

import { DEFAULT_WAIT_N_CONFIRMATIONS, getContractOrFail } from './contracts';

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
    publicClient: PublicClient,
    ritualId: number
  ): Promise<DkgParticipant[]> {
    const Coordinator = await this.connectReadOnly(publicClient);
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
    walletClient: WalletClient,
    providers: ChecksumAddress[]
  ): Promise<number> {
    const Coordinator = await this.connectReadWrite(walletClient);
    const tx = await Coordinator.initiateRitual(providers);
    const txReceipt = await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    const [ritualStartEvent] = txReceipt.events ?? [];
    if (!ritualStartEvent) {
      throw new Error('Ritual start event not found');
    }
    return ritualStartEvent.args?.ritualId;
  }

  public static async getRitual(
    publicClient: PublicClient,
    ritualId: number
  ): Promise<CoordinatorRitual> {
    const Coordinator = await this.connectReadOnly(publicClient);
    return Coordinator.rituals(ritualId);
  }

  public static async getRitualState(
    publicClient: PublicClient,
    ritualId: number
  ): Promise<DkgRitualState> {
    const Coordinator = await this.connectReadOnly(publicClient);
    return await Coordinator.getRitualState(ritualId);
  }

  public static async onRitualEndEvent(
    provider: PublicClient,
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

  private static async connectReadOnly(publicClient: PublicClient) {
    const contractAddress = getContractOrFail(
      'COORDINATOR',
      publicClient.chain?.id
    );
    return Coordinator__factory.connect(
      contractAddress,
      publicClientToProvider(publicClient)
    );
  }

  private static async connectReadWrite(walletClient: WalletClient) {
    const contractAddress = getContractOrFail(
      'COORDINATOR',
      walletClient.chain?.id
    );
    return Coordinator__factory.connect(
      contractAddress,
      walletClientToSigner(walletClient)
    );
  }
}
