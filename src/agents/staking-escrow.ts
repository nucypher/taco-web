import { Provider } from '@ethersproject/providers';

import { StakingEscrow, StakingEscrow__factory } from '../../types/ethers-contracts';

import { CONTRACTS } from './constants';

export class StakingEscrowAgent {
  public static async getCurrentPeriod(provider: Provider): Promise<number> {
    const StakingEscrow = await this.connect(provider);
    return StakingEscrow.getCurrentPeriod();
  }

  public static async getSecondsPerPeriod(provider: Provider): Promise<number> {
    const StakingEscrow = await this.connect(provider);
    return StakingEscrow.secondsPerPeriod();
  }

  private static async connect(provider: Provider): Promise<StakingEscrow> {
    const network = await provider.getNetwork();
    const contractAddress = CONTRACTS[network.name].STAKINGESCROW;
    return StakingEscrow__factory.connect(contractAddress, provider);
  }
}
