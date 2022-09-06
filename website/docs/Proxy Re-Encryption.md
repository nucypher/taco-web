---
slug: Proxy Re-Encryption.md
sidebar_position: 15
---

# Proxy Re-Encryption

The basic idea of proxy re-encryption is embodied by the ability of a proxy to transform ciphertexts under the public key of Alice into ciphertexts decryptable by Bob; to do so, the proxy must be in possession of a [re-encryption key](Glossary.md#re-encryption-key) that enables this process.
In addition, the proxy cannot learn any information about the encrypted messages, under any of the keys.