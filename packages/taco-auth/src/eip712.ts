import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { ethers } from 'ethers';
import { utils as ethersUtils } from 'ethers/lib/ethers';

import { LocalStorage } from './storage';

interface Eip712 {
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

interface FormattedEip712 extends Eip712 {
  primaryType: 'Wallet';
  types: {
    EIP712Domain: { name: string; type: string }[];
    Wallet: { name: string; type: string }[];
  };
}

export interface TypedSignature {
  signature: string;
  address: string;
  scheme: 'EIP712' | 'SIWE';
  typedData: Eip712;
}

interface ChainData {
  blockHash: string;
  chainId: number;
  blockNumber: number;
}

const EIP712Domain = [
  {
    name: 'name',
    type: 'string',
  },
  {
    name: 'version',
    type: 'string',
  },
  {
    name: 'chainId',
    type: 'uint256',
  },
  {
    name: 'salt',
    type: 'bytes32',
  },
];

export class EIP712SignatureProvider {
  private readonly storage: LocalStorage;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eip712-signature-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getItem(storageKey);
    if (maybeSignature) {
      return JSON.parse(maybeSignature);
    }

    // If at this point we didn't return, we need to create a new signature
    const typedSignature = await this.createWalletSignature();
    this.storage.setItem(storageKey, JSON.stringify(typedSignature));
    return typedSignature;
  }

  private async createWalletSignature(): Promise<TypedSignature> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash, chainId } = await this.getChainData();
    const address = await this.signer.getAddress();
    const signatureText = `I'm the owner of address ${address} as of block number ${blockNumber}`;
    const salt = ethersUtils.hexlify(ethersUtils.randomBytes(32));

    const scheme = 'EIP712';

    const typedData: Eip712 = {
      types: {
        Wallet: [
          { name: 'address', type: 'address' },
          { name: 'signatureText', type: 'string' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'taco',
        version: '1',
        chainId,
        salt,
      },
      message: {
        address,
        signatureText,
        blockNumber,
        blockHash,
      },
    };
    // https://github.com/ethers-io/ethers.js/issues/1431#issuecomment-813950552
    const signature = await (
      this.signer as unknown as TypedDataSigner
    )._signTypedData(typedData.domain, typedData.types, typedData.message);

    const formattedTypedData: FormattedEip712 = {
      ...typedData,
      primaryType: 'Wallet',
      types: {
        ...typedData.types,
        EIP712Domain,
      },
    };
    return { signature, address, scheme, typedData: formattedTypedData };
  }

  private async getChainData(): Promise<ChainData> {
    const blockNumber = await this.provider.getBlockNumber();
    const blockHash = (await this.provider.getBlock(blockNumber)).hash;
    const chainId = (await this.provider.getNetwork()).chainId;
    return { blockNumber, blockHash, chainId };
  }
}
