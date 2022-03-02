import { ChecksumAddress } from '../types';

interface Contracts {
  SUBSCRIPTION_MANAGER: ChecksumAddress;
}

const MUMBAI: Contracts = {
  SUBSCRIPTION_MANAGER: '0x17758Ca3B285480CFA6e991A2B56B2a11EB0287d#code',
};

export const CONTRACTS: Record<ChecksumAddress, Contracts> = {
  // Notice that keys match ethers.js naming convention
  mumbai: MUMBAI,
};

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
