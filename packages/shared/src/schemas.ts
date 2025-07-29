import { ethers } from 'ethers';
import { z } from 'zod';

const isAddress = (address: string) => {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return false;
  }
};

const isAddressStrict = (address: string) => {
  try {
    // Verify the address was checksummed to prevent passing an address that has a typo
    return address === ethers.utils.getAddress(address);
  } catch (e) {
    // If any error occurs during validation, fail the validation
    return false;
  }
};

export const EthAddressSchema = z
  .string()
  .refine(isAddress, { message: 'Invalid Ethereum address' });

export const EthAddressSchemaStrict = z.string().refine(isAddressStrict, {
  message: 'Invalid Ethereum address - it must be valid and checksummed',
});

const BLOCK_HASH_REGEXP = new RegExp('^0x[a-fA-F0-9]{64}$');
const BlockNumber = z.number().int().nonnegative();
const BlockHash = z.string().regex(BLOCK_HASH_REGEXP, 'Invalid block hash');
const BlockTag = z.enum(['earliest', 'finalized', 'safe', 'latest', 'pending']);

export const BlockIdentifierSchema = z.union([
  BlockNumber,
  BlockHash,
  BlockTag,
]);
