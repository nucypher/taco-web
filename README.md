# nucypher-ts

Communicate with NuCypher network from browser.

**This is a work in progress. Do not use in production.**

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

See [`nucypher-ts-demo`](https://github.com/nucypher/nucypher-ts-demo) for usage example with React app.

### Using Threshold Decryption

There are several schemes available for the user.
They follow a naming convention of `<NETWORK>-<M>-of-<N>`, where `M` is the threshold required, and `N` is the total size of the cohort.
`NETWORK` is either `mainnet` or `ibex`.

An encrypter can be created by:
```js
import { makeTDecEncrypter } from '@nucypher/nucypher-ts'

const encrypter = await makeTDecEncrypter("ibex-2-of-3");
```

The equivalent decrypter can be created by:
```js
import { makeTDecDecrypter } from '@nucypher/nucypher-ts'

// you can specify your own porter url here
const decrypter = await makeTDecDecrypter("ibex-2-of-3", "https://porter-ibex.nucypher.community")
```

Please note, the schemes for the encrypter and decrypter **must** match.

Encryption and decryption is then as simple as:
```js
const plaintext = toBytes('plaintext-message');
const encryptedMessageKit = encrypter.encryptMessage(plaintext);

const decryptedPlaintext = await decrypter.retrieveAndDecrypt([encryptedMessageKit]);
```