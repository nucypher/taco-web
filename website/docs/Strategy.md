---
slug: strategy
---

# Strategy

A Strategy combines all possible configuration parameters for using [CBD](./cdb).
It takes the following parameters:

- `cohort` - a [`Cohort`](./cohort) object
- `startDate` - the Strategy is valid from this date onwards
- `endDate`- the Strategy becomes invalid after this date
- `conditionSet?` - an optional [`ConditionSet`](./condition_set). If used, all encryptions made via this strategy have a default Condition Set assigned
- `aliceSecretKey?` - an optional Secret Key for the encrypter
- `bobSecretKey?` - an optional SecretKey for decrypter

If the optional secret keys are not provided, new ones will be generated instead.

## Create a Strategy

Assuming we have a [Cohort](./cohort) already defined, we can construct a Strategy:

```js
import { Cohort, Strategy } from '@nucypher/nucypher-ts';

const config = {
  threshold: 3,
  shares: 5,
  porterUri: 'https://porter-ibex.nucypher.community',
};
const newCohort = await Cohort.create(config);

const newStrategy = Strategy.create(
  newCohort,
  new Date(),
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
);
```

## Deploy a Strategy

Before we can encrypt/decrypt, the Threshold network needs to be made aware of our Strategy.
We do this by deploying:

```js
import detectEthereumProvider from '@metamask/detect-provider';
import providers from 'ethers';

const MMprovider = await detectEthereumProvider();
const rinkeby = providers.providers.getNetwork('Rinkeby');

if (MMprovider) {
  const web3Provider = new providers.providers.Web3Provider(
    MMprovider,
    rinkeby
  );
  const newDeployed = await newStrategy.deploy('test', web3Provider);
}
```

`Strategy.deploy` takes 2 parameters:

- `label` - this is a string that the network uses to identify the strategy
- `provider` - deploying a Strategy requires writing to a smart contract, so a connection to a wallet is required via a Web3 provider

Deploying a strategy returns a new `DeployedStrategy` object.
This object grants us access to the `encrypter` and `decrypter` which can then be used throughout an application.

```js
const encrypter = newDeployed.encrypter;
const decrypter = newDeployed.decrypter;

const plaintext = 'this is a secret';
const encryptedMessageKit = encrypter.encryptMessage(plaintext);

const decryptedMessage = await decrypter.retrieveAndDecrypt([
  encryptedMessageKit,
]);
```

## Import and Export Strategies

Strategies can be exported allowing them to be reused easily.
The syntax is the same whether the strategy has been deployed or not.

```js
import { DeployedStrategy } from '@nucypher/nucypher-ts';

const configJSON = newDeployed.toJSON();
console.log(configJSON)
/*
LARGE JSON OBJECT
*/
const importedStrategy = DeployedStrategy.fromJSON(configJSON)
```