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