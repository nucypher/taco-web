import { getContract } from '@nucypher/nucypher-contracts';
import { BigNumber, ContractTransaction, utils as ethersUtils } from 'ethers';
import { PublicClient, WalletClient } from 'viem';

import { Domain } from '../../porter';
import { ChecksumAddress } from '../../types';
import { publicClientToProvider, walletClientToSigner } from '../../viem';
import { DEFAULT_WAIT_N_CONFIRMATIONS } from '../const';
import { SubscriptionManager__factory } from '../ethers-typechain';

export class PreSubscriptionManagerAgent {
  public static async createPolicy(
    walletClient: WalletClient,
    domain: Domain,
    valueInWei: BigNumber,
    policyId: Uint8Array,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
    ownerAddress: ChecksumAddress,
  ): Promise<ContractTransaction> {
    const subscriptionManager = await this.connectReadWrite(
      walletClient,
      domain,
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
    publicClient: PublicClient,
    domain: Domain,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
  ): Promise<BigNumber> {
    const subscriptionManager = await this.connectReadOnly(
      publicClient,
      domain,
    );
    return await subscriptionManager.getPolicyCost(
      size,
      startTimestamp,
      endTimestamp,
    );
  }

  private static async connectReadOnly(
    publicClient: PublicClient,
    domain: Domain,
  ) {
    const chainId = await publicClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'SubscriptionManager');
    return SubscriptionManager__factory.connect(
      contractAddress,
      publicClientToProvider(publicClient),
    );
  }

  private static async connectReadWrite(
    walletClient: WalletClient,
    domain: Domain,
  ) {
    const chainId = await walletClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'SubscriptionManager');
    return SubscriptionManager__factory.connect(
      contractAddress,
      walletClientToSigner(walletClient),
    );
  }
}
