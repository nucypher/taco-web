---
slug: conditions
---

# Conditions

Several types of access conditions can be defined:

- EVM - on-chain state, eg NFT ownership, ETH balance, tx status, contract function call
- RPC - ethereum RPC calls as defined in the [Official API](https://ethereum.org/en/developers/docs/apis/json-rpc/#json-rpc-methods)
- Timelock - time-based conditions, eg Block Height

We provide many helper objects to streamline the creation of common conditions.
An expressive API also allows much more granular control of conditions, and we will provide examples of both methods wherever possible.

## `Conditions.ERC721Ownership`

`Conditions.ERC721Ownership` is a shortcut for building conditions that test for ownership of a specific ERC721 token (NFT):

```js
const NFTOwnership = new Conditions.ERC721Ownership({
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  parameters: [5954],
});
```

If we want to be more verbose we can use `Conditions.Condition`.
The above and below examples are completely equivalent:

```js
const NFTOwnershipConfig = {
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  standardContractType: 'ERC721',
  chain: 'ethereum',
  method: 'ownerOf',
  parameters: ['5954'],
  returnValueTest: {
    comparator: '==',
    value: ':userAddress',
  },
};
const NFTOwnership = new Conditions.Condition(NFTOwnershipConfig);
```

## `Conditions.ERC721Balance`

`Conditions.ERC721Balance` is a shortcut for building conditions that test for ownership of at least one ERC721 token (NFT) within a collection.

```js
const NFTBalance = new Conditions.ERC721Balance({
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
});
```

Alternatively:

```js
const NFTBalanceConfig = {
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  standardContractType: 'ERC721',
  chain: 'ethereum',
  method: 'balanceOf',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: '0',
  },
};

const NFTBalance = new Conditions.Condition(NFTBalanceConfig);
```

## `Conditions.TimelockCondition`

`Conditions.TimelockCondition` is a shortcut for building conditions that test against block height.

```js
const timelock = Conditions.TimelockCondition({
  returnValueTest: {
    comparator: '>',
    value: '100',
  },
});
```

or:

```js
const timelockConfig = {
  contractAddress: '',
  standardContractType: '',
  chain: 'ethereum',
  method: 'timelock',
  returnValueTest: {
    comparator: '>',
    value: '100',
  },
};
const timelock = Conditions.Condition(timelockConfig);
```

## `Conditions.RpcCondition`

`Conditions.RpcCondition` is a shortcut for building conditions that test against standard [RPC calls](https://ethereum.org/en/developers/docs/apis/json-rpc/)

```js
const const rpc = new Conditions.RpcCondition({
  chain: 'ethereum',
  method: 'eth_getBalance',
  parameters: [
      ":userAddress",
      "latest"
    ],
  returnValueTest: {
    comparator: ">=",
    value: "10000000000000"
  }
});
```

or:

```js
const rpcConfig = {
  contractAddress: '',
  standardContractType: '',
  chain: 'ethereum',
  method: 'eth_getBalance',
  parameters: [':userAddress', 'latest'],
  returnValueTest: {
    comparator: '>=',
    value: '10000000000000',
  },
};
const rpc = Conditions.Condition(rpcConfig);
```

## `Conditions.Condition`

`Conditions.Condition` provides full control over the configuration of a Condition.
It takes parameters:

- `contractAddress` is the public address of the contract we'd like to query.
- `standardContractType` can take values from `ERC20` and `ERC721`. Alternatively, an ABI can be passed through if a non standard contract is being used.
- `functionAbi` is the ABI of the function we'd like to call. This is optional if the contract is a standard `ERC20`, `ERC721` or `ERC1155`.
- `chain` - currently only `ethereum` is supported, please [Contact Us](https://discord.gg/RwjHbgA7uQ) if you require non-Ethereum based conditions.
- `method` the contract method that will be called.
- `parameters` are the parameters that will be passed to the contract's `method`.
- `returnValueTest` defines how the return value of the contract call should be evaluated.

### Non Zero balance of ERC20 Token

Here we're checking whether the user owns any `T` Threshold Network token:

```js
const ERC20Conditions = {
  contractAddress: '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5',
  standardContractType: 'ERC20',
  chain: 'ethereum',
  method: 'balanceOf',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: '0',
  },
};
```

<!-- ### Ownership of at least one ERC1155 token from a batch of ids

Batching can be applied to ERC721 tokens as well.

```js
const ERC1155Conditions = {
  contractAddress: '0x54F456B544abFb785694400bcb1D85629B2D437f',
  standardContractType: 'ERC1155',
  chain: 'ethereum',
  method: 'blanceOfBatch',
  parameters: [
    ':userAddress,:userAddress,:userAddress,:userAddress',
    '1,2,1001,1002',
  ],
  returnValueTest: {
    comparator: '>',
    value: '0',
  },
};
``` -->

### Function call of nonstandard Contract

In this example, we will check that the user is staking `T` Threshold Token.
The Threshold staking contract is located at [`0x01B67b1194C75264d06F808A921228a95C765dd7`](https://etherscan.io/address/0x01b67b1194c75264d06f808a921228a95c765dd7#readProxyContract).
The function we wish to call is `stakes` which takes an `address` as its parameter.
We need to provide the `contractAddress`, `functionName`, `functionParams`, and `functionAbi` when defining the condition.

```js
const customABICondition = {
  contractAddress: '0x01B67b1194C75264d06F808A921228a95C765dd7',
  functionName: 'stakes',
  functionParams: [':userAddress'],
  functionAbi: {
    inputs: [
      {
        internalType: 'address',
        name: 'stakingProvider',
        type: 'address',
      },
    ],
    name: 'stakes',
    outputs: [
      {
        internalType: 'uint96',
        name: 'tStake',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'keepInTStake',
        type: 'uint96',
      },
      {
        internalType: 'uint96',
        name: 'nuInTStake',
        type: 'uint96',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  chain: 'ethereum',
  returnValueTest: {
    key: 'tStake',
    comparator: '>',
    value: '0',
  },
};
```
