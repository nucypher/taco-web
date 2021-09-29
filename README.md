# nucypher-ts

Communicate with NuCypher network from browser.

**This is a work in progress**

## Usage

Notice: `nucypher-ts` requires setting up Porter from the [top of this PR](https://github.com/nucypher/nucypher/pull/2803).

Run with:

```bash
yarn install
yarn test
yarn build
```

Install git hooks
```bash
npx husky install
```

## Running the example

Build `nucypher-ts`:

```bash
yarn build
```

Run the example:

```
yarn install
yarn start
# outputs a URL to visit in browser
```

## GitHub Actions

CI is disabled. Enable it with:

```bash
gh workflow enable ci
```
