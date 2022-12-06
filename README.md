# nucypher-ts

A TypeScript library for interacting with access control functionality in the browser.

Full documentation can be found [here](https://docs.threshold.network/app-development/threshold-access-control-tac).

## Disclaimer

:warning: `nucypher-ts` is under [active development](https://github.com/nucypher/nucypher-ts/pulls):

- SDK does not support policy revocation.
- We expect breaking changes.

# Get Started with Threshold Access Control

This tutorial is a quick way for developers to learn about the Threshold Access Control service. We recommend reading about [Conditions-Based Decryption](https://docs.threshold.network/fundamentals/threshold-access-control/conditions-based-decryption-cbd) (CBD) before starting. CBD is a technology used in Threshold Access Control that allows for data sharing based on certain conditions.

## 1. Install `nucypher-ts`

To start, we need to install the `nucypher-ts` library:

```
yarn add @nucypher/nucypher-ts
```

## 2. Build a Cohort

Next, we will create a `Cohort` based on our risk preferences. A `Cohort` is a group of nodes that work together to control access to data. Threshold and Shares are two parameters used to create a `Cohort`. For example, a 3-of-5 `Cohort` needs at least 3 of the 5 members to provide shares to access the original data.

To create a `Cohort`, use the following code:

```javascript
import { Cohort } from '@nucypher/nucypher-ts';

const config = {
  threshold: 3,
  shares: 5,
  porterUri: 'https://porter-tapir.nucypher.community',
};
const newCohort = await Cohort.create(config);
```

In the code above, we provided a `porterUri` parameter. [Porter](https://docs.nucypher.com/en/latest/application_development/web_development.html#porter) is a web-based service that connects applications to nodes on the network. It acts as an "Infura for TAC". In this example, we used a Porter endpoint for the `tapir` testnet.

## 3. Create Conditions

We will now specify the conditions that must be met to access the data. In this tutorial, we will require that the requester owns an ERC721 token with a token ID of 5954.

```javascript
import { Conditions } from '@nucypher/nucypher-ts';

const NFTOwnership = new Conditions.ERC721Ownership({
  contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  chain: 5, // tapir uses the Goerli testnet
  parameters: [5954],
});
```

The `ERC721Ownership` condition checks the owner of a given token ID. It can be customized by using the `ownerOf` contract method and comparing it with the requestor's signature. For more information, see the [References](https://docs.threshold.network/app-development/threshold-access-control-tac/references/conditions#conditions.erc721ownership) section of the documentation.

There are other [`Condition` types](https://docs.threshold.network/app-development/threshold-access-control-tac/references/conditions), and it is possible to combine multiple conditions into a [`ConditionSet`](https://docs.threshold.network/app-development/threshold-access-control-tac/references/condition-set)_:_

```javascript
import { Conditions, ConditionSet } from '@nucypher/nucypher-ts';

const conditions = new ConditionSet([
  NFTOwnership,
  // Other conditions can be added here
]);
```

In this tutorial, we will only use a single condition.

## 5. Build a Strategy

We will now combine the `Cohort`, `ConditionSet`, and any other necessary parameters into a [`Strategy`](https://docs.threshold.network/app-development/threshold-access-control-tac/references/strategy):

```javascript
import { Strategy } from '@nucypher/nucypher-ts';

const newStrategy = Strategy.create(newCohort, conditions);
```

Next, we will deploy this `Strategy` to the Threshold Network. To do that, we're going to transact on Polygon Mumbai:

```typescript
import detectEthereumProvider from '@metamask/detect-provider';
import providers from 'ethers';

const MMprovider = await detectEthereumProvider();
const mumbai = providers.providers.getNetwork(80001);

if (MMprovider) {
  const web3Provider = new providers.providers.Web3Provider(MMprovider, mumbai);
  const newDeployed = await newStrategy.deploy('test', web3Provider);
}
```

:warning: Deploying a `Strategy` requires writing to the blockchain. This requires a wallet funded with testnet MATIC and connection to the blockchain via a `provider`(e.g. MetaMask).

## 6. Encrypt the plaintext

We can now encrypt data using the newly deployed `Strategy`. This means that future access to this data will be based on the ownership of the specified NFT. To encrypt the data, use the following code:

```javascript
const encrypter = newDeployed.encrypter;

const plaintext = 'this is a secret';
const encryptedMessageKit = encrypter.encryptMessage(plaintext);
```

## 7. Request decryption rights

Finally, we will test the access control service by requesting decryption rights:

```javascript
const decrypter = newDeployed.decrypter;

const conditionContext = conditions.buildContext(bobProvider);
const decryptedMessage = await decrypter.retrieveAndDecrypt(
  [encryptedMessageKit],
  conditionContext
);
```

At decryption time, the requester will be asked to verify their address by signing a message in MetaMask. This is where `conditionContext` comes into play. If they own the correct NFT, the message will decrypt successfully.

For more information about customizing and reusing `Cohort`, `Condition`, and `Strategy` objects, see the [References](https://docs.threshold.network/app-development/threshold-access-control-tac/references) page in the documentation.

# Contributing

If you would like to contribute to the development of `nucypher-ts`, please see our [Contributing Guide](CONTRIBUTING.md). You can also join our [Discord](http://discord.gg/threshold) and say hello!
