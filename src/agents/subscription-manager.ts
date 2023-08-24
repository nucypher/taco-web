import { BigNumber, ContractTransaction, utils as ethersUtils } from 'ethers';
import { PublicClient, WalletClient } from 'viem';

import { SubscriptionManager__factory } from '../../types/ethers-contracts';
import { ChecksumAddress } from '../types';
import { publicClientToProvider, walletClientToSigner } from '../viem';

import { DEFAULT_WAIT_N_CONFIRMATIONS, getContractOrFail } from './contracts';

export class PreSubscriptionManagerAgent {
  public static async createPolicy(
    walletClient: WalletClient,
    valueInWei: BigNumber,
    policyId: Uint8Array,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
    ownerAddress: ChecksumAddress
  ): Promise<ContractTransaction> {
    const SubscriptionManager = await this.connectReadWrite(walletClient);
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
    publicClient: PublicClient,
    size: number,
    startTimestamp: number,
    endTimestamp: number
  ): Promise<BigNumber> {
    const SubscriptionManager = await this.connectReadOnly(publicClient);
    return await SubscriptionManager.getPolicyCost(
      size,
      startTimestamp,
      endTimestamp
    );
  }

  private static async connectReadOnly(publicClient: PublicClient) {
    const contractAddress = getContractOrFail(
      'COORDINATOR',
      publicClient.chain?.id
    );
    return SubscriptionManager__factory.connect(
      contractAddress,
      publicClientToProvider(publicClient)
    );
  }

  private static async connectReadWrite(walletClient: WalletClient) {
    const contractAddress = getContractOrFail(
      'COORDINATOR',
      walletClient.chain?.id
    );
    return SubscriptionManager__factory.connect(
      contractAddress,
      walletClientToSigner(walletClient)
    );
  }
}
