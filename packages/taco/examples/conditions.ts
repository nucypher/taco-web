import { conditions } from '../src';

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
  method: 'balanceOf',
  parameters: [':userAddress'],
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
  'ContractCondition requires a signer',
);

const hasAnyNativeAsset = new conditions.base.RpcCondition({
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

const ownsNFTOnChain5 = new conditions.predefined.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5, // The first network we target
});

const hasAnyNativeAssetOnChain1 = new conditions.base.RpcCondition({
  chain: 1, // The second network we target
  method: 'eth_getBalance',
  parameters: [':userAddress'],
  returnValueTest: {
    index: 0,
    comparator: '>',
    value: 0,
  },
});

const multichainCondition = conditions.base.CompoundCondition.and([
  ownsNFTOnChain5,
  hasAnyNativeAssetOnChain1,
]);

console.assert(
  multichainCondition.requiresSigner(),
  'CompoundCondition requires signer',
);

const myFunctionAbi: conditions.FunctionAbiProps = {
  name: 'myFunction',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    {
      internalType: 'address',
      name: 'account',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'myCustomParam',
      type: 'uint256',
    },
  ],
  outputs: [
    {
      internalType: 'uint256',
      name: 'someValue',
      type: 'uint256',
    },
  ],
};

const myContractCallCondition = new conditions.base.ContractCondition({
  method: 'myFunctionAbi', // `myMethodAbi.name`
  parameters: [':userAddress', ':myCustomParam'], // `myMethodAbi.inputs`
  functionAbi: myFunctionAbi,
  contractAddress: '0x0...1',
  chain: 5,
  returnValueTest: {
    index: 0,
    comparator: '>',
    value: 0,
  },
});

console.assert(
  !myContractCallCondition.requiresSigner(),
  'ContractCondition does not require a signer',
);
