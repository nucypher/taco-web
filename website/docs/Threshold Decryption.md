---
slug: Threshold Decryption.md
sidebar_position: 16
---

Threshold Decryption (TDec) is a programmable access control service, in which decryption rights are typically based on the verified fulfillment of predefined conditions. Access conditions can be EVM-based (e.g. does the designated recipient own this NFT), RPC-driven (e.g. did the designated recipient commence active mining before this block) or time-based (e.g. has a preset period of time elapsed, after which the recipient's requests will be ignored). These conditions are also composable and can be combined in any logical sequence or decision tree.  

TDec involves splitting the secret (a decryption key) into multiples shares and distributing those among authorized and collateralized node operators (stakers in the Threshold network). A minimum number – a threshold – of those operators holding the key shares must be online and actively participate in order to reconstruct the original secret.

We refer to the _threshold_ and _shares_ as `m` and `n` and the overall configuration as `m-of-n`. Ie. in a `3-of-5` scheme, 3 out of 5 node operators are required to reconstruct the secret.

## Creating Threshold Decryption objects

`nucypher-ts` provides a simple builder function, `generateTDecEntities`. This function takes several parameters that define the the policy (e.g. `m` and `n`), returns objects for encrypting/decrypting data, and stores the configuration for later use.


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
const threshold = 3;
const shares = 5;
const label = 'example';
const startDate = new Date();
const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
const porterUrl =  'https://porter-ibex.nucypher.community';

  await generateTDecEntities(
    threshold,
    shares,
    provider,
    label,
    startDate,
    endDate,
    porterUrl
  );
```

## Rebuilding Threshold Decryption objects from configuration json

The `configuration` variable returned by `generateTDecEntities` is just a json object containing everything required to reconstruct the `encrypter` and `decrypter`.
```js
>>> console.log(configuration)
{
  policyEncryptingKey: PublicKey { ptr: 1159608 },
  encryptedTreasureMap: EncryptedTreasureMap { ptr: 2226584 },
  aliceVerifyingKey: PublicKey { ptr: 1158936 },
  bobSecretKey: SecretKey { ptr: 1178820 }
}
```

We can rebuild them using `TDecEntitiesFromConfig`:
```js
const [newEncrypter, newDecrypter] = await TDecEntitiesFromConfig(
  configuration,
  'https://porter-ibex.nucypher.community'
);
```

This allows us to create our encrypting/decrypting objects and store the configuration for use at a later time or in a different application.
For example we may want to encrypt data in a secure backend but allow users to access it (assuming [Conditions](Conditions.md) are met) from a decentralized frontend.