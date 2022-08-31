---
slug: /
sidebar_position: 1
---

# Getting Started

`nucypher-ts` is a typescript library to allow developers to interact with core Nucypher functionality within the browser.
It is in active development, so please be aware that things may change!

If you have any questions, don't hesitate to create an issue on [Github](https://github.com/nucypher/nucypher-ts), or come and say hello in our [Discord](https://discord.gg/RwjHbgA7uQ).


## Installation

Install into your project with:
```
yarn install @nucypher/nucypher-ts
```

## Basic Usage

You can quickly start using Threshold Decryption in the browser.
This requires an active connection to the Ethereum network, in this example we will use the [MetaMask Provider](https://docs.metamask.io/guide/ethereum-provider.html).

```js
import detectEthereumProvider from '@metamask/detect-provider';
import generateTDecEntities from '@nucypher/nucypher-ts'

const provider = await detectEthereumProvider();
const [encrypter, decrypter, _, _] =
      await generateTDecEntities(
        3, // threshold
        5, // shares
        provider, // eth provider, here we use metamask
        'example', // label your configuration
        new Date(), // start date
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // end date (in 30 days)
        'https://porter-ibex.nucypher.community'
      );

const plaintext = 'plaintext-message';
const encryptedMessage = encrypter.encryptMessage(plaintext);

const decryptedMessage = await decrypter.retrieveAndDecrypt([
      encryptedMessage
    ]);
```

## Contribution

Please see our [Contribution Guide](./Contributing.md)