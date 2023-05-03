import { ChainId, ChecksumAddress } from '../types';

type Contracts = {
  readonly SUBSCRIPTION_MANAGER: ChecksumAddress;
  readonly COORDINATOR: ChecksumAddress;
};

const POLYGON: Contracts = {
  SUBSCRIPTION_MANAGER: '0xB0194073421192F6Cf38d72c791Be8729721A0b3',
  COORDINATOR: '0x0',
};

const MUMBAI: Contracts = {
  SUBSCRIPTION_MANAGER: '0xb9015d7b35ce7c81dde38ef7136baa3b1044f313',
  COORDINATOR: '0x0',
};

const GOERLI: Contracts = {
  SUBSCRIPTION_MANAGER: '0x0',
  COORDINATOR: '0x2cf19429168a0943992D8e7dE534E9b802C687B6',
};

const CONTRACTS: { readonly [key in ChainId]: Contracts } = {
  [ChainId.POLYGON]: POLYGON,
  [ChainId.MUMBAI]: MUMBAI,
  [ChainId.GOERLI]: GOERLI,
};

export const getContract = (
  chainId: number,
  contract: keyof Contracts
): ChecksumAddress => {
  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`No contracts found for chainId: ${chainId}`);
  }
  if (!Object.keys(CONTRACTS[chainId as ChainId]).includes(contract)) {
    throw new Error(`No contract found for name: ${contract}`);
  }
  return CONTRACTS[chainId as ChainId][contract];
};

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
