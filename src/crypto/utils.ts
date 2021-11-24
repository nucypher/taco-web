import { hexlify } from 'ethers/lib/utils';

import { ChecksumAddress } from '../types';
import { fromHexString } from '../utils';

export const toCanonicalAddress = (address: string): Uint8Array => {
  const ETH_ADDRESS_STRING_PREFIX = '0x';
  const nonPrefixed = address.startsWith(ETH_ADDRESS_STRING_PREFIX)
    ? address.substring(ETH_ADDRESS_STRING_PREFIX.length)
    : address;
  return fromHexString(nonPrefixed);
};

export const toChecksumAddress = (bytes: Uint8Array): ChecksumAddress =>
  hexlify(bytes);
