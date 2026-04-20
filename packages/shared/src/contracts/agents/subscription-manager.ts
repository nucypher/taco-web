import { getContract } from '@nucypher/nucypher-contracts';
import {
  BigNumber,
  ContractTransaction,
  ethers,
  utils as ethersUtils,
} from 'ethers';

import { Domain } from '../../porter.js';
import { ChecksumAddress } from '../../types.js';
import { DEFAULT_WAIT_N_CONFIRMATIONS } from '../const.js';
import {
  SubscriptionManager,
  SubscriptionManager__factory,
} from '../ethers-typechain/index.js';

export class PreSubscriptionManagerAgent {
  public static async createPolicy(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    domain: Domain,
    valueInWei: BigNumber,
    policyId: Uint8Array,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
    ownerAddress: ChecksumAddress,
  ): Promise<ContractTransaction> {
    const subscriptionManager = await this.connectReadWrite(
      provider,
      domain,
      signer,
    );
    const overrides = {
      value: valueInWei.toString(),
    };
    const estimatedGas = await subscriptionManager.estimateGas.createPolicy(
      ethersUtils.hexlify(policyId),
      ownerAddress,
      size,
      startTimestamp,
      endTimestamp,
      overrides,
    );
    const tx = await subscriptionManager.createPolicy(
      ethersUtils.hexlify(policyId),
      ownerAddress,
      size,
      startTimestamp,
      endTimestamp,
      { ...overrides, gasLimit: estimatedGas },
    );
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }

  public static async getPolicyCost(
    provider: ethers.providers.Provider,
    domain: Domain,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<BigNumber> {
    const subscriptionManager = await this.connectReadOnly(provider, domain);
    return await subscriptionManager.getPolicyCost(
      size,
      startTimestamp,
      endTimestamp,
    );
  }

  private static async connectReadOnly(
    provider: ethers.providers.Provider,
    domain: Domain,
  ) {
    return await this.connect(provider, domain);
  }

  private static async connectReadWrite(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer: ethers.Signer,
  ) {
    return await this.connect(provider, domain, signer);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer?: ethers.Signer,
  ): Promise<SubscriptionManager> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(
      domain,
      network.chainId,
      'SubscriptionManager',
    );
    return SubscriptionManager__factory.connect(
      contractAddress,
      signer ?? provider,
    );
  }
}
