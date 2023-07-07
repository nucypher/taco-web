import { SessionStaticKey } from '@nucypher/nucypher-core';
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
  decryptionRequestStaticKey: SessionStaticKey;
};

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

  public static async getRitual(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<CoordinatorRitual> {
    const Coordinator = await this.connectReadOnly(provider);
    return Coordinator.rituals(ritualId);
  }

  private static async connectReadOnly(provider: ethers.providers.Provider) {
    return await this.connect(provider);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    signer?: ethers.providers.JsonRpcSigner
  ): Promise<Coordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(network.chainId, 'COORDINATOR');
    return Coordinator__factory.connect(contractAddress, signer ?? provider);
  }
}
