import lynxRegistryJson from '@nucypher/nucypher-contracts/deployment/artifacts/lynx.json';
import mainnetRegistryJson from '@nucypher/nucypher-contracts/deployment/artifacts/mainnet.json';
import tapirRegistryJson from '@nucypher/nucypher-contracts/deployment/artifacts/tapir.json';

import { Domain } from '../porter';
import { ChecksumAddress } from '../types';
import { ChainId } from '../web3';

export type Abi = unknown;

export type DeployedContract = {
  address: string;
  abi: Abi;
};

export const contractNames = [
  'Coordinator',
  'GlobalAllowList',
  'SubscriptionManager',
] as const;

export type ContractName = (typeof contractNames)[number];

export type Contract = {
  name: ContractName;
  abi: Abi;
};

export type ContractRegistry = {
  [chainId: string]: Record<string, DeployedContract>;
};

export const domainRegistry: Record<string, ContractRegistry> = {
  lynx: lynxRegistryJson,
  tapir: tapirRegistryJson,
  mainnet: mainnetRegistryJson,
};

export const getContract = (
  domain: Domain,
  chainId: ChainId,
  contract: ContractName,
): ChecksumAddress => {
  const registry = domainRegistry[domain];
  if (!registry) {
    throw new Error(`No contract registry found for domain: ${domain}`);
  }

  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`Invalid chainId: ${chainId}`);
  }

  const contracts = registry[chainId as ChainId];
  if (!contracts) {
    throw new Error(`No contracts found for chainId: ${chainId}`);
  }

  const deployedContract = contracts[contract];
  if (!deployedContract) {
    throw new Error(`No contract found for name: ${deployedContract}`);
  }

  return deployedContract.address as ChecksumAddress;
};

export const DEFAULT_WAIT_N_CONFIRMATIONS = 1;
