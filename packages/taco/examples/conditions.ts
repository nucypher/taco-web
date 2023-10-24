import { conditions } from '../src';
import { ContractConditionType } from '../src/conditions';
import { USER_ADDRESS_PARAM } from '../src/conditions/const';

const ownsNFT = new conditions.predefined.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
console.assert(ownsNFT.requiresSigner(), 'ERC721Ownership requires signer');

const hasAtLeastTwoNFTs = new conditions.predefined.ERC721Balance({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  chain: 5,
  returnValueTest: {
    index: 0,
    comparator: '>=',
    value: 2,
  },
});
console.assert(
  hasAtLeastTwoNFTs.requiresSigner(),
  'ERC721Balance requires signer',
);

const ownsNFTRaw = new conditions.base.ContractCondition({
  // Provided by the `predefined.ERC721Balance`
  conditionType: ContractConditionType,
  method: 'balanceOf',
  parameters: [USER_ADDRESS_PARAM], // ':userAddress'
  standardContractType: 'ERC721',
  // User-provided
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  chain: 5,
  returnValueTest: {
    index: 0,
    comparator: '>',
    value: 0,
  },
});
console.assert(
  ownsNFTRaw.requiresSigner(),
  'ContractCondition requires signer',
);

const hasAnyNativeAsset = new conditions.base.RpcCondition({
  conditionType: 'rpc',
  chain: 5,
  method: 'eth_getBalance',
  parameters: [':userAddress'],
  returnValueTest: {
    index: 0,
    comparator: '>',
    value: 0,
  },
});
console.assert(
  hasAnyNativeAsset.requiresSigner(),
  'RpcCondition requires signer',
);
