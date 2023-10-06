import { fromHexString } from './utils';

export enum ChainId {
  POLYGON = 137,
  MUMBAI = 80001,
  GOERLI = 5,
  ETHEREUM_MAINNET = 1,
}

export const toCanonicalAddress = (address: string): Uint8Array => {
  const ethAddressStringPrefix = '0x';
  const nonPrefixed = address.startsWith(ethAddressStringPrefix)
    ? address.substring(ethAddressStringPrefix.length)
    : address;
  return fromHexString(nonPrefixed);
};
