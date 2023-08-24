import { fromHexString } from './utils';
export const toCanonicalAddress = (address: string): Uint8Array => {
  const ETH_ADDRESS_STRING_PREFIX = '0x';
  const nonPrefixed = address.startsWith(ETH_ADDRESS_STRING_PREFIX)
    ? address.substring(ETH_ADDRESS_STRING_PREFIX.length)
    : address;
  return fromHexString(nonPrefixed);
};

export interface Eip712TypedData {
  types: {
    Wallet: { name: string; type: string }[];
  };
  domain: {
    salt: string;
    chainId: number;
    name: string;
    version: string;
  };
  message: {
    blockHash: string;
    address: string;
    blockNumber: number;
    signatureText: string;
  };
}

export interface FormattedTypedData extends Eip712TypedData {
  types: {
    EIP712Domain: { name: string; type: string }[];
    Wallet: { name: string; type: string }[];
  };
}
