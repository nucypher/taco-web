---
slug: Proxy Re-Encryption.md
sidebar_position: 15
---

# Proxy Re-Encryption

The basic idea of proxy re-encryption is embodied by the ability of a proxy to transform ciphertexts under the public key of Alice into ciphertexts decryptable by Bob; to do so, the proxy must be in possession of a [re-encryption key](Glossary.md#re-encryption-key) that enables this process.
In addition, the proxy cannot learn any information about the encrypted messages, under any of the keys.

:::note

The PRE Application nodes do not store or handle an application’s data; instead - it manages **access** to application data.
Management of encrypted secrets and public keys tends to be highly domain-specific - the surrounding architecture will vary greatly depending on the throughput, sensitivity, and sharing cadence of application secrets.

In all cases, the PRE Application must be integrated with a storage and transport layer in order to function properly.
Along with the transport of ciphertexts, applications will need to include channels for Alice and Bob to discover each other’s public keys, and provide policy encrypting information to Bob and Enrico.

:::

## Creating PRE characters


```js
import detectEthereumProvider from '@metamask/detect-provider';
import { Alice, Bob, SecretKey } from '@nucypher/nucypher-ts';

const provider = await detectEthereumProvider();
const secretKey = SecretKey.fromBytes(Buffer.from('fake-secret-key-32-bytes-alice-x'));
const alice = Alice.fromSecretKey(config, secretKey, provider);
```