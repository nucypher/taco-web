# nucypher-ts

Communicate with NuCypher network from browser.

## Disclaimer

**This is a work in progress**

- SDK does not support policy revocation.
- We expect breaking changes.

## Supported networks

`nucypher-ts` is available on the following networks:

- Polygon
- Mumbai (Polygon testnet)

## Usage

Run with:

```bash
yarn install
yarn test
yarn build
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

## Examples

See `./test` directory for usage examples.

See `./examples` directory for examples of browser integration.

See `./examples/api-example.ts` for an abridged API example.

See [`nucypher-ts-demo`](https://github.com/nucypher/nucypher-ts-demo) for usage example with React app.
