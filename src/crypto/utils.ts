import { computeAddress } from 'ethers/lib/utils';
import { ChecksumAddress, UmbralPublicKey } from '../types';
import { ETH_ADDRESS_STRING_PREFIX } from './constants';

export const toCanonicalAddress = (address: string): Buffer => {
  const nonPrefixed = address.startsWith(ETH_ADDRESS_STRING_PREFIX)
    ? address.substring(ETH_ADDRESS_STRING_PREFIX.length)
    : address;
  return Buffer.from(nonPrefixed, 'hex');
};

export const canonicalAddressFromPublicKey = (
  aliceVerifyingKey: UmbralPublicKey
): Buffer => {
  // TODO: Is this key compressed?
  const asPublicKey = Buffer.from(aliceVerifyingKey.toBytes());
  // `ethers.util.computeAddress` doesn't care whether key is compressed or not
  const ethAddress = computeAddress(asPublicKey);
  return toCanonicalAddress(ethAddress);
};

export const toChecksumAddress = (bytes: Buffer): ChecksumAddress => {
  return `0x${Buffer.from(bytes).toString('hex')}`;
};
