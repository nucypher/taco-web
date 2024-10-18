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
