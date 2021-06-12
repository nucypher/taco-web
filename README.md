# nucypher-ts

Boilerplate for `js-nucypher` replacement.

**This is a work in progress**

Additional information about the project setup are in `README.old.md`.

## Usage

Checkout git submodules

```bash
git submodule update --init --recursive
```

Continue with:

```bash
yarn install
yarn test
yarn build
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

## Github Actions

CI is disabled. Enable it with:

```bash
gh workflow disable ci
```
