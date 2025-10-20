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

Development versions are available for testing features before official releases. They can be installed using npm tags:

```bash
# Latest auto-published dev version
pnpm add @nucypher/taco@dev
pnpm add @nucypher/taco-auth@dev
pnpm add @nucypher/shared@dev

# Specific manually-published version with custom tag
pnpm add @nucypher/taco@dev-access-client
pnpm add @nucypher/taco-auth@dev-access-client
pnpm add @nucypher/shared@dev-access-client
```

**Development version formats:**

*Auto-published (from epic versions branches):*
```
{version}-dev.{commit-hash}
Example: 0.5.1-dev.a1b2c3d4
```

*Manually published (custom suffix):*
```
{version}-dev.{suffix}.{commit-hash}
Example: 0.5.1-dev.access-client.a1b2c3d4
```

**When to use dev versions:**
- ✅ Testing new features
- ✅ Providing feedback on unreleased features
- ✅ Testing specific feature branches via custom tags (e.g., `@dev-access-client`)

**When NOT to use dev versions:**
- ❌ Production environments
- ❌ Stable development work

**Note:** Dev versions are automatically published when code is merged to `epic-v*.*.x` branches and can be manually published with custom tags. These versions are unstable and may contain breaking changes or even sometimes broken code..

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
