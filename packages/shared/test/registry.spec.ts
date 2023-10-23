import { describe, expect, it } from 'vitest';

import { ChainId, ContractName, getContract } from '../src';

const testCases: [string, number, ContractName][] = [
  ['lynx', ChainId.MUMBAI, 'Coordinator'],
  ['lynx', ChainId.MUMBAI, 'GlobalAllowList'],
  ['lynx', ChainId.MUMBAI, 'SubscriptionManager'],
  ['tapir', ChainId.MUMBAI, 'Coordinator'],
  ['tapir', ChainId.MUMBAI, 'GlobalAllowList'],
  ['tapir', ChainId.MUMBAI, 'SubscriptionManager'],
];

describe('registry', () => {
  for (const testCase of testCases) {
    const [domain, chainId, contract] = testCase;
    it(`should for domain ${domain}, chainId ${chainId}, contract ${contract}`, () => {
      const contractAddress = getContract(domain, chainId, contract);
      expect(contractAddress).toBeDefined();
    });
  }
});
