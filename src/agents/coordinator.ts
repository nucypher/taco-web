import { ethers } from 'ethers';

import {
  Coordinator,
  Coordinator__factory,
} from '../../types/ethers-contracts';

import { getContract } from './contracts';

export class CoordinatorAgent {
  public static async getParticipants(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<Coordinator.ParticipantStructOutput[]> {
    const Coordinator = await this.connectReadOnly(provider);
    return await Coordinator.getParticipants(ritualId);
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
