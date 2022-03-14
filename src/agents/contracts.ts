import { ChecksumAddress } from '../types';

interface Contracts {
  SUBSCRIPTION_MANAGER: ChecksumAddress;
}

const MUMBAI: Contracts = {
  SUBSCRIPTION_MANAGER: '0x17758Ca3B285480CFA6e991A2B56B2a11EB0287d',
};

const CONTRACTS: Record<number, Contracts> = {
  80001: MUMBAI,
};

export const getContracts = (chainId: number): Contracts => {
  const contracts = CONTRACTS[chainId];
  if (!contracts) {
    console.error(`No contracts found for chainId: ${chainId}`)
    return contracts;
  }
  return contracts;
}

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
