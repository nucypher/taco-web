---
slug: Revocation.md
sidebar_position: 30
---

:::caution

Revocation is under active development and is not currently considered stable.
If you need Revocation immediately, we suggest using a [Custom Revocation Contract](#custom-revocation-contract).

:::

## Custom Revocation Contract

It is possible to implement Revocation using [Conditions](Conditions.md) that rely on a function call to a [Custom Smart Contract](Conditions.md#function-call-of-non-standard-contract).
This allows the handling of revocation to be decentralized and transparent.
Here is an example of a smart contract (not suitable for production):

```js
pragma solidity 0.8.7;

contract Revocation {

    mapping(address => bool) public isRevoked;

    function revoke(address user) public {
        isRevoked[user] = true;
    }

    function unRevoke(address user) public {
        isRevoked[user] = false;
    }
}
```

And the associated Condition:

```js
const revocationCondition = {
  contractAddress: 'DEPLOYED_CONTRACT_ADDRESS',
  functionName: 'isRevoked',
  functionParams: [':userAddress'],
  functionAbi: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'isRevoked',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  chain: 'ethereum',
  returnValueTest: {
    key: '',
    comparator: '==',
    value: false,
  },
};
```

The condition we have defined calls the `isRevoked` function of the smart contract and passes the user's address.
If the call returns `false` (**not** revoked, ie granted), then decryption will occur.
If the call returns `true` (**is** revoked), then decryption will fail.
