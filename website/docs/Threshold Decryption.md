---
slug: Threshold Decryption.md
sidebar_position: 16
---

Decentralized threshold cryptography involves splitting a key into many parts (shares) and distributing those among authorized network members.
A certain number (threshold) of members who have the corresponding parts of the keys will be needed in order to reconstruct the original secret.
We refer to the threshold and shares as `m` and `n` and the overall configuration as `m-of-n`
Ie. in a `3-of-5` scheme 3 out of the original 5 decentralized members are required to reconstruct the secret.

## Creating Threshold Decryption objects

`nucypher-ts` provides a simple builder function, `generateTDecEntities`.
This function takes several parameter that define the the policy, and returns objects for encrypting/decrypting data, and storing the policy configuration for later use.


We must pass in the `threshold` and `shares` as defined above.
We must also include:
- `provider` - lets us interface with the ETH blockchain for validating the user and making rpc requests
- `label` - to reference this configuration
- `startDate` - when is the policy valid from
- `endDate` - when is the policy valid until
- `porterUri` - a connection to [Porter](Glossary.md#porter)

There is an optional parameter, `aliceSecretKey`.
If this is provided, the resulting `encrypter` is constructed from the secret key provided, rather than one being created at runtime.

```js
import detectEthereumProvider from '@metamask/detect-provider';
import generateTDecEntities from '@nucypher/nucypher-ts'

const provider = await detectEthereumProvider();
const [encrypter, decrypter, policy, configuration] =
      await generateTDecEntities(
        3, // threshold
        5, // shares
        provider, // eth provider, here we use metamask
        'example', // label your configuration
        new Date(), // start date
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // end date (in 30 days)
        'https://porter-ibex.nucypher.community'
      );
```