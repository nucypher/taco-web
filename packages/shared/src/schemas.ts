import { ethers } from 'ethers';
import { z } from 'zod';

export const ETH_ADDRESS_REGEXP = new RegExp('^0x[a-fA-F0-9]{40}$');

const isAddress = (address: string) => {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return false;
  }
};

export const EthAddressSchema = z
  .string()
  .regex(ETH_ADDRESS_REGEXP)
  .refine(isAddress, { message: 'Invalid Ethereum address' });
