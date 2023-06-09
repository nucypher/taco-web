import { ethers } from 'ethers';

import {
  Coordinator,
  Coordinator__factory,
} from '../../types/ethers-contracts';
import { BLS12381 } from '../../types/ethers-contracts/Coordinator';

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

export interface DkgParticipant {
  node: string;
  aggregated: boolean;
  transcript: string;
  publicKey: string;
}

export class DkgCoordinatorAgent {
  public static async getParticipants(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<DkgParticipant[]> {
    const Coordinator = await this.connectReadOnly(provider);
    // TODO: Remove `as unknown` cast after regenerating the contract types: https://github.com/nucypher/nucypher-contracts/pull/77
    return (await Coordinator.getParticipants(
      ritualId
    )) as unknown as DkgParticipant[];
  }

  public static async getRitual(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<CoordinatorRitual> {
    const Coordinator = await this.connectReadOnly(provider);
    return await Coordinator.rituals(ritualId);
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
