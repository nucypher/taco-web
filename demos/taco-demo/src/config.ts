import { domains } from '@nucypher/taco';

export const DEFAULT_RITUAL_ID = parseInt(process.env.DEFAULT_RITUAL_ID || '5');
export const DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN || domains.TESTNET;
