# nucypher-ts

A TypeScript library for interacting with access control functionality in the browser.

Full documentation can be found [here](https://docs.threshold.network/app-development/threshold-access-control-tac).

> **Warning**
>
> `nucypher-ts` is under [active development](https://github.com/nucypher/nucypher-ts/pulls):
>
> - SDK does not support policy revocation.
> - We expect breaking changes.

## Installation

```
yarn add @nucypher/nucypher-ts
```

### Mainnet and Testnet releases

`nucypher-ts` supports early testnet releases at `oryx`, `tapir`, and `lynx` networks, as well as a stable `mainnet` release. You can see up-to-date versions and the respective network tags on [npm.js](https://www.npmjs.com/package/@nucypher/nucypher-ts?activeTab=versions). See example below:

![image](https://github.com/nucypher/nucypher-ts/assets/39299780/44d1e3e8-1d0b-4381-bbbc-1bcffae009c4)

Here, we can see that the `mainnet` version, which is also the `nucypher-ts@latest` version, corresponds to `nucypher-ts@0.10.0`. We can also see that `tapir` and `oryx` networks both support early release of `nucypher-ts@1.0.0-beta.1`.

Make sure you use the relevant `nucypher-ts` version depending on the network you intend to use.

## Tutorial

To learn more, follow the tutorial at Threshold Network's [docs](https://docs.threshold.network/app-development/threshold-access-control-tac/get-started-with-tac).

## Examples

See [`nucypher-ts/examples`](https://github.com/nucypher/nucypher-ts/tree/main/examples) to find out how to integrate `nucypher-ts` into your favorite web framework.

We also provide two code samples of TAC applications:

- [nucypher/tdec-sandbox](https://github.com/nucypher/tdec-sandbox)
- [nucypher/tdec-nft-example](https://github.com/nucypher/tdec-nft-example)

These examples showcase integration with React-based web application and an end-to-end flow of creating conditioned encryption, and encrypting & decrypting data.

# Contributing

If you would like to contribute to the development of `nucypher-ts`, please see our [Contributing Guide](CONTRIBUTING.md). You can also join our [Discord](http://discord.gg/threshold) and say hello!
