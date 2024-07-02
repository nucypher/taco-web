import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { ethers } from 'ethers';
import { utils as ethersUtils } from 'ethers/lib/ethers';
import { z } from 'zod';

import { AuthProvider } from '../auth-provider';
import { AuthSignature } from '../auth-sig';
import { LocalStorage } from '../storage';


const typeFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
});

const domain = z.object({
  salt: z.string(),
  chainId: z.number(),
  name: z.string(),
  version: z.string(),
});

const messageSchema = z.object({
  blockHash: z.string(),
  address: z.string(),
  blockNumber: z.number(),
  signatureText: z.string(),
});

export const EIP712TypedDataSchema = z.object({
  primaryType: z.literal('Wallet'),
  types: z.object({
    EIP712Domain: z.array(typeFieldSchema),
    Wallet: z.array(typeFieldSchema),
  }),
  domain: domain,
  message: messageSchema,
});


export type EIP712TypedData = z.infer<typeof EIP712TypedDataSchema>;

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

/**
 * @deprecated Use EIP4361AuthProvider instead.
 */
export class EIP712AuthProvider implements AuthProvider {
  private readonly storage: LocalStorage;

  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    console.warn(
      'DeprecationWarning: The EIP712AuthProvider authentication provider is deprecated. ' +
      'Please use EIP4361AuthProvider instead. Refer to the documentation for more details.'
    );
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eip712-signature-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      return maybeSignature;
    }

    // If at this point we didn't return, we need to create a new signature
    const authSignature = await this.createAuthMessage();
    this.storage.setAuthSignature(storageKey, authSignature);
    return authSignature;
  }

  private async createAuthMessage(): Promise<AuthSignature> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash, chainId } = await this.getChainData();
    const address = await this.signer.getAddress();
    const signatureText = `I'm the owner of address ${address} as of block number ${blockNumber}`;
    const salt = ethersUtils.hexlify(ethersUtils.randomBytes(32));

    const typedData = {
      types: {
        Wallet: [
          { name: 'address', type: 'address' },
          { name: 'signatureText', type: 'string' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'TACo',
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

    const formattedTypedData: EIP712TypedData = {
      ...typedData,
      primaryType: 'Wallet',
      types: {
        ...typedData.types,
        EIP712Domain,
      },
    };
    const scheme = 'EIP712';
    return { signature, address, scheme, typedData: formattedTypedData };
  }

  private async getChainData(): Promise<ChainData> {
    const blockNumber = await this.provider.getBlockNumber();
    const block = await this.provider.getBlock(blockNumber);
    const blockHash = block.hash;
    const chainId = (await this.provider.getNetwork()).chainId;
    return { blockNumber, blockHash, chainId };
  }
}
