import { ethers } from 'ethers';
import { z } from 'zod';

const isAddress = (address: string) => {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return false;
  }
};

export const EthAddressSchema = z
  .string()
  .refine(isAddress, { message: 'Invalid Ethereum address' });

const BLOCK_HASH_REGEXP = new RegExp('^0x[a-fA-F0-9]{64}$');
const BlockNumber = z.number().int().nonnegative();
const BlockHash = z.string().regex(BLOCK_HASH_REGEXP, 'Invalid block hash');
const BlockTag = z.enum(['earliest', 'finalized', 'safe', 'latest', 'pending']);

export const BlockIdentifierSchema = z.union([BlockNumber, BlockHash, BlockTag]);