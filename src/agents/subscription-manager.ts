import { BigNumber, ContractTransaction, ethers } from 'ethers';
import { hexlify } from 'ethers/lib/utils';

import {
  SubscriptionManager,
  SubscriptionManager__factory,
} from '../../types/ethers-contracts';
import { TransactingPower } from '../crypto/powers';
import { ChecksumAddress } from '../types';

import { DEFAULT_WAIT_N_CONFIRMATIONS, getContracts } from './contracts';

export class SubscriptionManagerAgent {
  public static async createPolicy(
    transactingPower: TransactingPower,
    valueInWei: BigNumber,
    policyId: Uint8Array,
    size: number,
    startTimestamp: number,
    endTimestamp: number,
    ownerAddress: ChecksumAddress
  ): Promise<ContractTransaction> {
    const SubscriptionManager = await this.connect(
      transactingPower.provider,
      transactingPower.signer
    );
    // TODO: Call fails due to "UNPREDICTABLE_GAS_LIMIT" error, hard-coding `gasLimit` for now
    // const estimatedGas = await SubscriptionManager.estimateGas.createPolicy(
    //   policyId,
    //   ownerAddress,
    //   expirationTimestamp,
    //   nodeAddresses
    // );
    const overrides = {
      // gasLimit: estimatedGas.toNumber(),
      gasLimit: 350_000,
      value: valueInWei,
    };
    const tx = await SubscriptionManager.createPolicy(
      hexlify(policyId),
      ownerAddress,
      size,
      startTimestamp,
      endTimestamp,
      overrides
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
    const SubscriptionManager = await this.connect(provider);
    const feeRateRange = await SubscriptionManager.getPolicyCost(
      size,
      startTimestamp,
      endTimestamp
    );
    return feeRateRange;
  }

  private static async connect(
    provider: ethers.providers.Provider,
    signer?: ethers.providers.JsonRpcSigner
  ): Promise<SubscriptionManager> {
    const network = await provider.getNetwork();
    const contractAddress = getContracts(network.chainId).SUBSCRIPTION_MANAGER;
    return SubscriptionManager__factory.connect(
      contractAddress,
      signer ?? provider
    );
  }
}
