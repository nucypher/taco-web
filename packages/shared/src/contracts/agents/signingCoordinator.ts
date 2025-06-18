import { getContract } from '@nucypher/nucypher-contracts';
import { ethers } from 'ethers';

import { Domain } from '../../porter';
import { SigningCoordinator__factory } from '../ethers-typechain';
import { SigningCoordinator } from '../ethers-typechain/SigningCoordinator';

export type SigningParticipant = {
  provider: string;
  operator: string;
  signature: string;
};

export class SigningCoordinatorAgent {
  public static async getParticipants(
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
  ): Promise<SigningParticipant[]> {
    const coordinator = await this.connectReadOnly(provider, domain);
    const participants = await coordinator[
      'getSigners(uint32)'
    ](ritualId);

    return participants.map((participant) => {
      return {
        operator: participant.operator,
      };
    });
  }

  private static async connectReadOnly(
    provider: ethers.providers.Provider,
    domain: Domain,
  ) {
    return await this.connect(provider, domain);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer?: ethers.Signer,
  ): Promise<SigningCoordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(domain, network.chainId, 'SigningCoordinator');
    return SigningCoordinator__factory.connect(contractAddress, signer ?? provider);
  }
}
