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

## LLM Condition Authoring Skill

For LLM-assisted TACo condition authoring, use [`./taco-condition-authoring-skill.md`](./taco-condition-authoring-skill.md). It contains a reusable prompt template, constraint rules, examples, and a validation workflow for producing valid condition JSON.

Humans can open the file and follow the "Quick Start" section.

LLM or agent users should explicitly reference the file and ask the model to use it, for example: "Use `taco-condition-authoring-skill.md` to author a TACo condition for <policy description>, then follow the validation loop in that skill."

# Contributing

If you would like to contribute to the development of `taco-web`, please see our [Contributing Guide](CONTRIBUTING.md).
You can also join our [Discord](https://discord.gg/threshold) and say hello!
