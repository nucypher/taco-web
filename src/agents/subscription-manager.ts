import {
  BigNumber,
  ContractTransaction,
  ethers,
  utils as ethersUtils,
} from 'ethers';

import {
  SubscriptionManager,
  SubscriptionManager__factory,
} from '../../types/ethers-contracts';
import { ChecksumAddress } from '../types';

import { DEFAULT_WAIT_N_CONFIRMATIONS, getContract } from './contracts';

export class PreSubscriptionManagerAgent {
  public static async createPolicy(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    valueInWei: BigNumber,
    policyId: Uint8Array,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
    ownerAddress: ChecksumAddress
  ): Promise<ContractTransaction> {
    const SubscriptionManager = await this.connectReadWrite(provider, signer);
    const overrides = {
      value: valueInWei.toString(),
    };
    const estimatedGas = await SubscriptionManager.estimateGas.createPolicy(
      ethersUtils.hexlify(policyId),
      ownerAddress,
      size,
      startTimestamp,
      endTimestamp,
      overrides
    );
    const tx = await SubscriptionManager.createPolicy(
      ethersUtils.hexlify(policyId),
      ownerAddress,
      size,
      startTimestamp,
      endTimestamp,
      { ...overrides, gasLimit: estimatedGas }
    );
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }

  public static async getPolicyCost(
    provider: ethers.providers.Provider,
    size: number,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<BigNumber> {
    const SubscriptionManager = await this.connectReadOnly(provider);
    return await SubscriptionManager.getPolicyCost(
      size,
      startTimestamp,
      endTimestamp
    );
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
  ): Promise<SubscriptionManager> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(
      network.chainId,
      'SUBSCRIPTION_MANAGER'
    );
    return SubscriptionManager__factory.connect(
      contractAddress,
      signer ?? provider
    );
  }
}
