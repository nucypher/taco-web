# taco-web

A TypeScript library for interacting with access control functionality in the browser.

Full documentation can be found [here](https://docs.taco.build/).

> **Warning**
>
> `taco-web` is under [active development](https://github.com/nucypher/taco-web/pulls):
>
> - We expect breaking changes.

## Installation

```
pnpm add @nucypher/taco
```

### Development Versions

For testing features from `epic-**` branches before they're officially released, you can install development versions published with the `dev` tag:

```bash
pnpm add @nucypher/taco@dev
pnpm add @nucypher/taco-auth@dev
pnpm add @nucypher/shared@dev
```

**Development version format:**
```
{next-version}-dev.{branch-name}.{date}.{commit-hash}.{build-number}
```

**Example:**
```
1.2.4-dev.epic-new-feature.20250120.aeed464a.17
```

**When to use dev versions:**
- ✅ Testing new features from epic branches which contains pre-release functionality
- ✅ Providing feedback on unreleased features

**When NOT to use dev versions:**
- ❌ Production environments
- ❌ Stable development work

**Note:** Dev versions are automatically published when code is merged to `epic-**` branches and sometimes manually published. These versions are unstable and may contain breaking changes or even sometimes broken code.

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
