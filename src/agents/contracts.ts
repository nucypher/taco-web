import { ChecksumAddress } from '../types';

interface Contracts {
  SUBSCRIPTION_MANAGER: ChecksumAddress;
}

const POLYGON: Contracts = {
  SUBSCRIPTION_MANAGER: '0xB0194073421192F6Cf38d72c791Be8729721A0b3'
}

const MUMBAI: Contracts = {
  SUBSCRIPTION_MANAGER: '0xb9015d7b35ce7c81dde38ef7136baa3b1044f313',
};

const CONTRACTS: Record<number, Contracts> = {
  137: POLYGON,
  80001: MUMBAI,
};

export const getContracts = (chainId: number): Contracts => {
  const contracts = CONTRACTS[chainId];
  if (!contracts) {
    throw new Error(`No contracts found for chainId: ${chainId}`);
  }
  return contracts;
};

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
