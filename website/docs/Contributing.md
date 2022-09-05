---
slug: Contributing.md
sidebar_position: 50
---

# Contribution Guide

Download, install, build, and test with:

```bash
git clone https://github.com/nucypher/nucypher-ts
cd nucypher-ts
yarn install
yarn build
yarn test
```

## Development

Install git hooks

```bash
npx husky install
```

Generate contract typings

```bash
yarn typechain
```

Prepare a new release

```bash
yarn run prepare-release
```

## Documentation

To launch a local development version of the documentation:

```bash
cd website
yarn run start
```
This will launch a local server, available at `http://localhost:3000`.

To release a new version of the documentations:

```bash
yarn run docusaurus docs:version 1.1.0
```

## Publishing

Publish a new release on NPM.

Pay attention to output of these commands and fix your release if needed.

To build and publish a release, run

```bash
yarn prepare-release
# Or, to publish an alpha release
yarn prepare-release:alpha
```

Follow instructions from the command output to finalize the process.