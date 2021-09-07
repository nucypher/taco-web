import { ContractTransaction, Wallet } from 'ethers';

import {
  PolicyManager,
  PolicyManager__factory,
} from '../../types/ethers-contracts';
import { TransactingPower } from '../crypto/powers';
import { ChecksumAddress } from '../types';
import { toHexString } from '../utils';

import { CONTRACTS, DEFAULT_WAIT_N_CONFIRMATIONS } from './constants';

export class PolicyManagerAgent {
  public static async createPolicy(
    policyId: Uint8Array,
    transactingPower: TransactingPower,
    value: number, // wei
    expirationTimestamp: number,
    nodeAddresses: Array<ChecksumAddress>,
    ownerAddress?: ChecksumAddress
  ): Promise<ContractTransaction> {
    const PolicyManager = await this.connect(transactingPower.wallet);

    // TODO: Tx fails due to "UNPREDICTABLE_GAS_LIMIT" error, hardcoding `gasLimit` for now
    // const estimatedGas = await PolicyManager.estimateGas.createPolicy(
    //   policyId,
    //   ownerAddress ?? transactingPower.account,
    //   endTimestamp,
    //   nodeAddresses
    // );
    const overrides = {
      // gasLimit: estimatedGas.toNumber(),
      gasLimit: 600_000,
      value,
    };
    const tx = await PolicyManager.createPolicy(
      `0x${toHexString(policyId)}`, // TODO: Use etherjs arraify/hexlify?
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
