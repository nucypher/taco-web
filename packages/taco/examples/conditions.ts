import { ChainId } from '@nucypher/shared';

import { conditions } from '../src';

const ownsNFT = new conditions.predefined.erc721.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: ChainId.SEPOLIA,
});
console.assert(
  ownsNFT.requiresAuthentication(),
  'ERC721Ownership requires authentication',
);

const hasAtLeastTwoNFTs = new conditions.predefined.erc721.ERC721Balance({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  chain: ChainId.SEPOLIA,
  returnValueTest: {
    comparator: '>=',
    value: 2,
  },
});
console.assert(
  hasAtLeastTwoNFTs.requiresAuthentication(),
  'ERC721Balance requires authentication',
);

const ownsNFTRaw = new conditions.base.contract.ContractCondition({
  // Provided by the `predefined.ERC721Balance`
  method: 'balanceOf',
  parameters: [':userAddress'],
  standardContractType: 'ERC721',
  // User-provided
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  chain: ChainId.SEPOLIA,
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});
console.assert(
  ownsNFTRaw.requiresAuthentication(),
  'ContractCondition requires a signer',
);

const hasAnyNativeAsset = new conditions.base.rpc.RpcCondition({
  chain: ChainId.SEPOLIA,
  method: 'eth_getBalance',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});
console.assert(
  hasAnyNativeAsset.requiresAuthentication(),
  'RpcCondition requires authentication',
);

const ownsNFTOnChain5 = new conditions.predefined.erc721.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: ChainId.SEPOLIA, // The first network we target
});

const hasAnyNativeAssetOnChain1 = new conditions.base.rpc.RpcCondition({
  chain: 1, // The second network we target
  method: 'eth_getBalance',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});

const multichainCondition = conditions.compound.CompoundCondition.and([
  ownsNFTOnChain5,
  hasAnyNativeAssetOnChain1,
]);

console.assert(
  multichainCondition.requiresAuthentication(),
  'CompoundCondition requires authentication',
);

const myFunctionAbi: conditions.base.contract.FunctionAbiProps = {
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

const myContractCallCondition = new conditions.base.contract.ContractCondition({
  method: 'myFunctionAbi', // `myMethodAbi.name`
  parameters: [':userAddress', ':myCustomParam'], // `myMethodAbi.inputs`
  functionAbi: myFunctionAbi,
  contractAddress: '0x0...1',
  chain: ChainId.SEPOLIA,
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});

console.assert(
  !myContractCallCondition.requiresAuthentication(),
  'ContractCondition does not require a signer',
);

// Wallet Allowlist Condition Example
const walletAllowlistCondition =
  new conditions.base.walletAllowlist.WalletAllowlistCondition({
    addresses: [
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      '0x0000000000000000000000000000000000000001',
    ],
  });

console.assert(
  walletAllowlistCondition.requiresAuthentication(),
  'WalletAllowlistCondition requires authentication',
);

// You can check if an address is allowed with the condition's toObj method
const addressToCheck = '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77';
const addresses = walletAllowlistCondition.toObj().addresses;
// This would be checked by taco nodes after validating the wallet signature provided by encryptor (the value of the variable `addressToCheck`).
const isAllowed = addresses.includes(addressToCheck);
console.log(`Is address ${addressToCheck} allowed? ${isAllowed}`);
