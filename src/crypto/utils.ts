import { computeAddress } from 'ethers/lib/utils';
import { PublicKey } from 'umbral-pre';

import { ChecksumAddress } from '../types';
import { fromHexString, toHexString } from '../utils';

import { ETH_ADDRESS_STRING_PREFIX } from './constants';

export const toCanonicalAddress = (address: string): Uint8Array => {
  const nonPrefixed = address.startsWith(ETH_ADDRESS_STRING_PREFIX)
    ? address.substring(ETH_ADDRESS_STRING_PREFIX.length)
    : address;
  return fromHexString(nonPrefixed);
};

export const canonicalAddressFromPublicKey = (
  aliceVerifyingKey: PublicKey
): Uint8Array => {
  // TODO: Is this key compressed?
  // `ethers.util.computeAddress` doesn't care whether key is compressed or not
  const ethAddress = computeAddress(aliceVerifyingKey.toBytes());
  return toCanonicalAddress(ethAddress);
};

export const toChecksumAddress = (bytes: Uint8Array): ChecksumAddress => {
  return `0x${toHexString(bytes)}`;
};
