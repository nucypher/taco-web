import { ethers } from 'ethers';

import { ChecksumAddress } from './types';
import { fromHexString } from './utils';

// TODO: Remove this abstraction and use ethers directly?
export class Web3Provider {
  private constructor(
    private readonly web3Provider: ethers.providers.Web3Provider
  ) {}

  public static fromEthersWeb3Provider(
    web3Provider: ethers.providers.Web3Provider
  ) {
    return new Web3Provider(web3Provider);
  }

  public getAddress(): Promise<ChecksumAddress> {
    return this.web3Provider.getSigner().getAddress();
  }

  public get provider(): ethers.providers.Web3Provider {
    return this.web3Provider;
  }

  public get signer(): ethers.providers.JsonRpcSigner {
    return this.web3Provider.getSigner();
  }
}

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
    salt: Uint8Array;
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

export interface Eip712TypedDataWithDomain extends Eip712TypedData {
  types: {
    EIP712Domain: { name: string; type: string }[];
    Wallet: { name: string; type: string }[];
  };
}
