import { fromHexString } from '../utils';

export const toCanonicalAddress = (address: string): Uint8Array => {
  const ETH_ADDRESS_STRING_PREFIX = '0x';
  const nonPrefixed = address.startsWith(ETH_ADDRESS_STRING_PREFIX)
    ? address.substring(ETH_ADDRESS_STRING_PREFIX.length)
    : address;
  return fromHexString(nonPrefixed);
};
