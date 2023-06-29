import { SessionStaticKey, Transcript } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import {
  Coordinator,
  Coordinator__factory,
} from '../../types/ethers-contracts';
import { BLS12381 } from '../../types/ethers-contracts/Coordinator';
import { fromHexString } from '../utils';

import { getContract } from './contracts';

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
  // TODO: How do I get the transcript from the Coordinator?
  transcript: Transcript;
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
    provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<DkgParticipant[]> {
    const Coordinator = await this.connectReadOnly(provider);
    const participants = await Coordinator.getParticipants(ritualId);

    return participants.map((participant) => {
      return {
        provider: participant.provider,
        aggregated: participant.aggregated,
        transcript: Transcript.fromBytes(fromHexString(participant.transcript)),
        decryptionRequestStaticKey: SessionStaticKey.fromBytes(
          fromHexString(participant.decryptionRequestStaticKey)
        ),
      };
    });
  }

  public static async getRitual(
    provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<CoordinatorRitual> {
    const Coordinator = await this.connectReadOnly(provider);
    return Coordinator.rituals(ritualId);
  }

  public static async getRitualState(
    provider: ethers.providers.Web3Provider,
    ritualId: number
  ): Promise<DkgRitualState> {
    const Coordinator = await this.connectReadOnly(provider);
    return await Coordinator.getRitualState(ritualId);
  }

  private static async connectReadOnly(
    provider: ethers.providers.Web3Provider
  ) {
    return await this.connect(provider);
  }

  private static async connect(
    provider: ethers.providers.Web3Provider,
    signer?: ethers.providers.JsonRpcSigner
  ): Promise<Coordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(network.chainId, 'COORDINATOR');
    return Coordinator__factory.connect(contractAddress, signer ?? provider);
  }
}
