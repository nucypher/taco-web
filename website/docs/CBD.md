---
slug: cbd
---

# Condition-Based Decryption

Condition-Based Decryption (CBD) is a programmable access control service, in which decryption rights are based on the verified fulfillment of predefined conditions.
Access conditions can be EVM-based (e.g. does the requester own this NFT?), RPC-driven (e.g. does the requester have at least X amount of a given token in their wallet?) or time-based (e.g. has a preset period elapsed, after which the recipient's requests will be ignored?).
These conditions are also composable and can be combined in any logical sequence or decision tree.  

CBD involves splitting a joint secret (a decryption key) into multiples _shares_ and distributing those among authorized and collateralized node operators ([Stakers](https://threshold.network/earn/staker) in the Threshold network).
A minimum number – a _threshold_ – of those operators holding the key shares must be online and actively participate in partial decryptions that can subsequently be combined by the requester to reconstruct the original plaintext data.

## Build a Cohort
A [Cohort](./cohort) defines the collection of nodes that will provide CBD services.
_Threshold_ and _Shares_ are two parameters used to construct a Cohort.
For example, a `3-of-5` Cohort requires a threshold of 3 out of 5 shares to reconstruct the original plaintext data.

We can define a cohort by:

```js
import { Cohort } from '@nucypher/nucypher-ts'

const config = {
    threshold: 3,
    shares: 5,
    porterUri: 'https://porter-ibex.nucypher.community',
};
const newCohort = await Cohort.create(config);
```

We also provide `porterUri`.
[Porter](./Glossary.md#porter) is a web-based service that interacts with nodes on the network on behalf of applications.
In this case, we are using an `ibex` porter which means we're on a testnet.

## Create a Condition

Condition-Based Decryption also needs some [Conditions](./conditions).
In this tutorial, we will check that the user owns a specific ERC721 NFT.

```js
import { Conditions } from '@nucypher/nucypher-ts'

const NFTOwnership = new Conditions.ERC721Ownership({
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    chain: 'Rinkeby', // Ibex uses Rinkeby testnet
    parameters: [
      "5954"
    ],
});
```
It is possible to compose multiple Conditions into a [ConditionSet](./condition_set), but for now, we will only use one:

```js
import { Conditions, ConditionSet } from '@nucypher/nucypher-ts'

const conditions = new ConditionSet([NFTOwnership])
```

## Build a Strategy

We combine our Cohort, Conditions, and any other extra parameters into a [Strategy](./strategy).

```js
import { Strategy } from '@nucypher/nucypher-ts'

const newStrategy = Strategy.create(
      newCohort,
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
      conditions
);
```

Finally, we can deploy this Strategy to the Threshold Network, and begin using Condition-Based Decryption:

:::note

Deploying a Strategy requires writing to the blockchain.
This means both a funded wallet is required and also a connection to the blockchain via a `provider` (eg. MetaMask).

:::

```js
import detectEthereumProvider from '@metamask/detect-provider';
import providers from 'ethers';

const MMprovider = await detectEthereumProvider();
const rinkeby = providers.providers.getNetwork('Rinkeby');

if (MMprovider) {
    const web3Provider = new providers.providers.Web3Provider(MMprovider, rinkeby);
    const newDeployed = await newStrategy.deploy('test', web3Provider);
};
```

Our encrypter and decrypter objects are available by:

```js
const encrypter = newDeployed.encrypter;
const decrypter = newDeployed.decrypter;

const plaintext = 'this is a secret';
const encryptedMessageKit = encrypter.encryptMessage(plaintext);

const decryptedMessage = await decrypter.retrieveAndDecrypt(
    [encryptedMessageKit]
);
```

At decryption time, the requester will be asked to verify their address by signing a message in MetaMask.
Assuming they pass the conditions, the message will be decrypted successfully.