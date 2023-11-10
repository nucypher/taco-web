# `nodejs-taco` integration example

Shows how to use `@nucypher/taco` in Node.js.

## Setup

This script needs 3 environment variables, that you can update in `.env`:
* `RPC_PROVIDER_URL`: For TACo testnet you should use a Polygon Mumbai endpoint.
* `CREATOR_PRIVATE_KEY` and `CONSUMER_PRIVATE_KEY`: Hex-encoded private keys for the Creator and the Consumer, respectively. 
We provide some defaults in `.env.example`, but we encourage you to choose your own.

## Usage

```bash
pnpm install
pnpm start
```
