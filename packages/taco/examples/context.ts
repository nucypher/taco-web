import { conditions } from '../src';
import { CustomContextParam } from '../src/conditions/context';

const ownsNFTRaw = new conditions.base.ContractCondition({
  method: 'balanceOf',
  parameters: [':userAddress'],
  standardContractType: 'ERC721',
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  chain: 5,
  returnValueTest: {
    comparator: '>',
    value: ':selectedBalance',
  },
});
console.assert(
  ownsNFTRaw.requiresSigner(),
  'ContractCondition requires a signer',
);

const customParameters: Record<string, CustomContextParam> = {
  ':selectedBalance': 2,
};
console.log(customParameters);
