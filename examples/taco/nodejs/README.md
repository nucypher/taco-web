# `nodejs-taco` integration example

This example shows how to use `@nucypher/taco` in Node.js.

## Setup

This script needs 3 environment variables, that you can set in the `.env` file:

* `RPC_PROVIDER_URL`: For TACo testnet you should use a Polygon Mumbai endpoint.
* `ENCRYPTOR_PRIVATE_KEY` and `CONSUMER_PRIVATE_KEY`: Hex-encoded private keys for the Encryptor and the Consumer,
  respectively.

Default values for these variables are provided in `.env.example`, so you can run:

```bash
cp .env.example .env
```

However, we encourage you to choose your own values for these variables.

## Usage

To run the script, you just need to install this example package and start it:

```bash
pnpm install
pnpm start
```

## Learn more

Please find developer documentation for
TACo [here](https://docs.threshold.network/app-development/threshold-access-control-tac).
