import { ContractTransaction } from 'ethers';

import { TransactingPower } from '../crypto/powers';
import { ChecksumAddress } from '../types';
import { PolicyManager__factory } from '../../types/ethers-contracts';
import {
  DEFAULT_WAIT_N_CONFIRMATIONS,
  POLICY_MANAGER_ADDRESS,
} from './constants';

export class PolicyManagerAgent {
  public static async createPolicy(
    policyId: Buffer,
    transactingPower: TransactingPower,
    value: number, // wei
    endTimestamp: number,
    nodeAddresses: Array<ChecksumAddress>,
    ownerAddress?: ChecksumAddress
  ): Promise<ContractTransaction> {
    const PolicyManager = PolicyManager__factory.connect(
      POLICY_MANAGER_ADDRESS,
      transactingPower.wallet
    );
    const tx = await PolicyManager.createPolicy(
      policyId,
      ownerAddress ?? transactingPower.account,
      endTimestamp,
      nodeAddresses
    );
    // TODO: Should we wait for TX to be mined?
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    return tx;
  }
}
