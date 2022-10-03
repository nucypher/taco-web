---
slug: cbd
---

# Condition Based Decryption

Condition Based Decryption (CBD) is a programmable access control service, in which decryption rights are based on the verified fulfillment of predefined conditions.
Access conditions can be EVM-based (e.g. does the designated recipient own this NFT), RPC-driven (e.g. did the designated recipient commence active mining before this block) or time-based (e.g. has a preset period of time elapsed, after which the recipient's requests will be ignored).
These conditions are also composable and can be combined in any logical sequence or decision tree.  

CBD involves splitting the secret (a decryption key) into multiples shares and distributing those among authorized and collateralized node operators ([Stakers](https://threshold.network/earn/staker) in the Threshold network).
A minimum number – a threshold – of those operators holding the key shares must be online and actively participate in partial decryptions that can subsequently be combined by the requester to reconstruct the original plaintext data.

We refer to the _threshold_ and _shares_ as `m` and `n` and the overall configuration as `m-of-n`.
I.e. in a `3-of-5` [Cohort](./Cohort.md), 3 out of 5 node operators are required to reconstruct the original plaintext data.

## Build a Cohort

## Build a Strategy

Lots of other things define CBD, these are configurable in a Strategy, blah blah blah

## Deploy a Strategy

Let's tell the T network about our good work!

## Create a Condition

CBD obviously needs a condition!

## Encrypt and Decrypt

that's what we're here for.