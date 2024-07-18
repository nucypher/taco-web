# Contribution Guide

- [Quick Start](#quick-start)
  - [Setup](#setup)
  - [Development](#development)
  - [Documentation](#documentation)
  - [Publishing](#publishing)
- [External Api](#external-api)
- [Design and Architecture](#design-and-architecture)
# Quick Start

### Setup
Download, install, build, and test with:

```bash
git clone https://github.com/nucypher/taco-web
cd taco-web
pnpm install
```

### Basic Development Commands

Execute common tasks with:

```bash
pnpm build
pnpm test
pnpm lint
pnpm fix
```

### Documentation

Build and publish documentation with:

```bash
pnpm typedoc
pnpm typedoc:publish
```

### Deployment

TODO: Update after implementing automated publishing.

# External Api
This is the api that we expose to developers.
It is defined in [`packages/taco/src/taco.ts`](https://github.com/nucypher/taco-web/blob/main/packages/taco/src/taco.ts)

# Design and Architecture

## User Authentication
[SIWE](https://docs.login.xyz/) (Sign In With Ethereum, [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)) is the default authentication method.
EIP-712 has previously been supported but is now deprecated.

The below test demonstrates how a SIWE message can be reused for TACo authentication.
This ensures that users don't have to sign multiple messages when loggin into apps and decrypting TACo messages.
https://github.com/nucypher/taco-web/blob/b689493a37bec0b168f80f43347818095c3dd5ce/packages/taco/test/conditions/context.test.ts#L382C1-L429C6