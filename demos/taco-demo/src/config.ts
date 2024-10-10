import { domains } from '@nucypher/taco';

export const DEFAULT_RITUAL_ID = parseInt(process.env.DEFAULT_RITUAL_ID || '6');
export const DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN || domains.TESTNET;

// Node 2 is free
export const IRYS_NODE_URL =
  process.env.IRYS_NODE_URL || 'https://node2.irys.xyz';
// Devnet RPC URLs change often, use a recent one from https://chainlist.org/chain/80002
export const RPC_URL = 'https://rpc-amoy.polygon.technology/';
