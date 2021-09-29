import { ContractTransaction, Wallet } from 'ethers';
import { hexlify } from 'ethers/lib/utils';

import {
  PolicyManager,
  PolicyManager__factory,
} from '../../types/ethers-contracts';
import { TransactingPower } from '../crypto/powers';
import { ChecksumAddress } from '../types';

import { CONTRACTS, DEFAULT_WAIT_N_CONFIRMATIONS } from './constants';

export class PolicyManagerAgent {
  public static async createPolicy(
    policyId: Uint8Array,
    transactingPower: TransactingPower,
    valueInWei: number,
    expirationTimestamp: number,
    nodeAddresses: Array<ChecksumAddress>,
    ownerAddress?: ChecksumAddress
  ): Promise<ContractTransaction> {
    const PolicyManager = await this.connect(transactingPower.wallet);

    // TODO: Call fails due to "UNPREDICTABLE_GAS_LIMIT" error, hard-coding `gasLimit` for now
    // const estimatedGas = await PolicyManager.estimateGas.createPolicy(
    //   policyId,
    //   ownerAddress ?? transactingPower.account,
    //   endTimestamp,
    //   nodeAddresses
    // );
    const overrides = {
      // gasLimit: estimatedGas.toNumber(),
      gasLimit: 600_000,
      value: valueInWei,
    };
    const tx = await PolicyManager.createPolicy(
      hexlify(policyId),
      ownerAddress ?? transactingPower.account,
      expirationTimestamp,
      nodeAddresses,
      overrides
    );
    // TODO: Should we wait for TX to be mined?
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }

  private static async connect(wallet: Wallet): Promise<PolicyManager> {
    const network = await wallet.provider.getNetwork();
    const contractAddress = CONTRACTS[network.name].POLICYMANAGER;
    return PolicyManager__factory.connect(contractAddress, wallet);
  }
}
