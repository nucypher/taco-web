import { z } from 'zod';

export const ETH_ADDRESS_REGEXP = new RegExp('^0x[a-fA-F0-9]{40}$');
export const EthAddressSchema = z.string().regex(ETH_ADDRESS_REGEXP);
