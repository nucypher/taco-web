# taco-web

A TypeScript library for interacting with access control functionality in the browser.

Full documentation can be found [here](https://docs.taco.build/).

> **Warning**
>
> `taco-web` is under [active development](https://github.com/nucypher/taco-web/pulls):
>
> - We expect breaking changes.

## Installation

### Stable Release

```bash
pnpm add @nucypher/taco
```

### Development Versions

Development versions are automatically published when code is merged to `epic-*` branches. These versions are useful for testing new features before they are officially released.

#### Installing a dev version

```bash
# Install the latest dev version
pnpm add @nucypher/taco@dev

# Or install a specific dev version
pnpm add @nucypher/taco@1.2.3-dev.epic-new-feature.20231025.42
```

#### Finding available dev versions

```bash
# List all available versions including dev tags
npm view @nucypher/taco versions

# Or view on npm
# https://www.npmjs.com/package/@nucypher/taco?activeTab=versions
```

**Note:** Development versions are intended for testing purposes and should not be used in production. They follow the naming convention: `{version}-dev.{branch-name}.{date}.{build-number}`

## Tutorial

To learn more, follow the tutorial at Threshold
Network's [docs](https://docs.taco.build/taco-integration/).

## Examples

See [`taco-web/examples`](https://github.com/nucypher/taco-web/tree/main/examples) to find out how to
integrate `taco-web` into your favorite web framework.

We also provide demos of TACo applications:

- [taco-demo](https://github.com/nucypher/taco-web/tree/main/demos/taco-demo)
- [taco-nft-demo](https://github.com/nucypher/taco-web/tree/main/demos/taco-nft-demo)

These examples showcase integration with web applications utilizing an end-to-end flow of creating encrypted data with associated conditions and enacting access-controlled decryption.

## Condition Schemas

Learn more about the available condition schemas and their properties. You may check the [condition schema documentation](./packages/taco/schema-docs/condition-schemas.md) for detailed information on each schema type.

# Contributing

If you would like to contribute to the development of `taco-web`, please see our [Contributing Guide](CONTRIBUTING.md).
You can also join our [Discord](https://discord.gg/threshold) and say hello!
