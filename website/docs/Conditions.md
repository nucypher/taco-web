---
slug: Conditions.md
sidebar_position: 20
---

# Conditions
Several types of access conditions can be defined:
- EVM - on chain state, eg NFT ownership, ETH balance, tx status, contract function call
- RPC - ethereum RPC calls as defined in the [Official API](https://ethereum.org/en/developers/docs/apis/json-rpc/#json-rpc-methods)
- Timelock - time based conditions, eg Block Time, Block Height, UTC Time

## EVM Conditions
Here is an example EVM condition for ownership of a specific ERC721 token (NFT):

```js
const ERC721Conditions = {
    contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    standardContractType: "ERC721",
    chain:  "ethereum",
    method: "ownerOf",
    parameters: [
      "5954"
    ],
    returnValueTest: {
      comparator: "=",
      value: ":userAddress"
    }
  }
```

- `contractAddress` is the public address of the contract we'd like to query.
- `standardContractType` can take values from `ERC20, ERC721` and `ERC1155`. Alternatively, an ABI can be passed through if a non standard contract is being used.
- `chain` currently only `ethereum` is supported, please [Contact Us](https://discord.gg/RwjHbgA7uQ) if you require non ethereum based conditions.
- `method` the contract method that will be called.
- `parameters` the parameters that will be passed to the contract's `method`.
- `returnValueTest` defines how the return value of the contract call should be evaluated.

In the above example, we query the `ownerOf` method of an `ERC721` token contract which is located at `0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D`.
We are testing whether the `ownerOf` token number `5954` is the current user.
The symbol `:userAddress` is how we define the current user, who will have to authenticate themselves by signing a message using a tool such as MetaMask.

### Ownership of any token in an ERC721 collection (NFT Collection)

```js
const ERC721Conditions = {
    contractAddress: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",
    standardContractType: "ERC721",
    chain:  "ethereum",
    method: "blanceOf",
    parameters: [
      ":userAddress"
    ],
    returnValueTest: {
      comparator: ">",
      value: "0"
    }
  }
```

### Own at least one ERC20 Token
Here we're checking whether the user owns any `T` Threshold Network token
```js
const ERC20Conditions = {
    contractAddress: "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
    standardContractType: "ERC20",
    chain:  "ethereum",
    method: "blanceOf",
    parameters: [
      ":userAddress"
    ],
    returnValueTest: {
      comparator: ">",
      value: "0"
    }
  }
```

### Ownership of at least one ERC1155 token from a batch of ids
Batching can be applied to ERC721 tokens as well.
```js
const ERC115Conditions = {
    contractAddress: "0x54F456B544abFb785694400bcb1D85629B2D437f",
    standardContractType: "ERC115",
    chain:  "ethereum",
    method: "blanceOfBatch",
    parameters: [
      ":userAddress,:userAddress,:userAddress,:userAddress",
      "1,2,1001,1002"
    ],
    returnValueTest: {
      comparator: ">",
      value: "0"
    }
  }
```

### Function call of non standard Contract
In this example we will check that the user is staking `T` Threshold Token.
The Threshold staking contract is located at [`0x01B67b1194C75264d06F808A921228a95C765dd7`](https://etherscan.io/address/0x01b67b1194c75264d06f808a921228a95c765dd7#readProxyContract).
The function we wish to call is `stakes` which takes an `address` as it's parameter.
We need to provide the `contractAddress`, `functionName`, `functionParams`, and `functionAbi` when defining the condition.

```js
const customABICondition = {
    contractAddress: "00x01B67b1194C75264d06F808A921228a95C765dd7",
    functionName: "stakes",
    functionParams: [":userAddress"],
    functionAbi: {
        inputs: [
        {
            internalType: "address",
            name: "stakingProvider",
            type: "address"
        }
        ],
        name: "stakes",
        outputs: [
        {
            internalType: "uint96",
            name: "tStake",
            type: "uint96"
        },
        {
            internalType: "uint96",
            name: "keepInTStake",
            type: "uint96"
        },
        {
            internalType: "uint96",
            name: "nuInTStake",
            type: "uint96"
        }
        ],
        stateMutability: "view",
        type: "function"
    },
    chain:  "ethereum",
    returnValueTest: {
      key: "tStake",
      comparator: ">",
      value: "0"
    }
  }
```

## RPC Conditions

Here will will query the ETH balance of the users address using the RPC call [`eth_getBalance`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getbalance)
```js
const ETHBalance = {
    contractAddress: "",
    standardContractType: "",
    chain:  "ethereum",
    method: "eth_getBalance",
    parameters: [
      ":userAddress",
      "latest"
    ],
    returnValueTest: {
      comparator: ">=",
      value: "10000000000000"
    }
  }
```

## Time Conditions