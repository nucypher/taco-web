import { fromHexString } from './utils.js';

export enum ChainId {
  POLYGON = 137,
  AMOY = 80002,
  SEPOLIA = 11155111,
  ETHEREUM_MAINNET = 1,
}

export const toCanonicalAddress = (address: string): Uint8Array => {
  const ethAddressStringPrefix = '0x';
  const nonPrefixed = address.startsWith(ethAddressStringPrefix)
    ? address.substring(ethAddressStringPrefix.length)
    : address;
  return fromHexString(nonPrefixed);
};
