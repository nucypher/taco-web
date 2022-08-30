---
slug: Conditions.md
sidebar_position: 2
---

# Conditions
Several types of access conditions can be defined:
- EVM - on chain state, eg NFT ownership, ETH balance, tx status, contract function call
- RPC - ethereum RPC calls as defined in the [Official API](https://ethereum.org/en/developers/docs/apis/json-rpc/#json-rpc-methods)
- Timelock - time based conditions

## EVM Condition
Here is an example EVM condition for ownership of an NFT/ERC721 token:

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