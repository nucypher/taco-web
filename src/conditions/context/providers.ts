import { utils as ethersUtils } from 'ethers/lib/ethers';
import { PublicClient, WalletClient } from 'viem';
import {
  getBlock,
  getBlockNumber,
  requestAddresses,
  signTypedData,
} from 'viem/actions';

import { toPublicClient } from '../../viem';
import { Eip712TypedData } from '../../web3';

export interface TypedSignature {
  signature: string;
  typedData: Eip712TypedData;
  address: string;
}

interface ChainData {
  blockHash: string;
  chainId: number;
  blockNumber: number;
}

export class WalletAuthenticationProvider {
  private walletSignature?: Record<string, string>;
  private readonly publicClient: PublicClient;

  constructor(private readonly walletClient: WalletClient) {
    this.publicClient = toPublicClient(walletClient);
  }

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const address = await this.getAddress();
    const storageKey = `wallet-signature-${address}`;

    // If we have a signature in localStorage, return it
    const isLocalStorage = typeof localStorage !== 'undefined';
    if (isLocalStorage) {
      const maybeSignature = localStorage.getItem(storageKey);
      if (maybeSignature) {
        return JSON.parse(maybeSignature);
      }
    }

    // If not, try returning from memory
    const maybeSignature = this.walletSignature?.[address];
    if (maybeSignature) {
      if (isLocalStorage) {
        localStorage.setItem(storageKey, maybeSignature);
      }
      return JSON.parse(maybeSignature);
    }

    // If at this point we didn't return, we need to create a new signature
    const typedSignature = await this.createWalletSignature();

    // Persist where you can
    if (isLocalStorage) {
      localStorage.setItem(storageKey, JSON.stringify(typedSignature));
    }
    if (!this.walletSignature) {
      this.walletSignature = {};
    }
    this.walletSignature[address] = JSON.stringify(typedSignature);
    return typedSignature;
  }

  private async createWalletSignature(): Promise<TypedSignature> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash, chainId } = await this.getChainData();
    const address = await this.getAddress();
    const signatureText = `I'm the owner of address ${address} as of block number ${blockNumber}`;
    const salt = ethersUtils.hexlify(
      ethersUtils.randomBytes(32)
    ) as `0x${string}`;
    const [account] = await requestAddresses(this.walletClient);

    const types = {
      Wallet: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'salt', type: 'bytes32' },
      ],
    };
    const domain = {
      name: 'cbd',
      version: '1',
      chainId,
      salt,
    };
    const message = {
      address,
      signatureText,
      blockNumber,
      blockHash,
    };
    const typedData = {
      account,
      types,
      primaryType: 'Wallet',
      domain,
      message,
    } as const;
    const signature = await signTypedData(this.walletClient, typedData);

    return { signature, typedData, address };
  }

  private async getAddress() {
    const [address] = await requestAddresses(this.publicClient);
    if (!address) {
      throw new Error('No address found');
    }
    return address;
  }

  private async getChainData(): Promise<ChainData> {
    const blockNumber = Number(await getBlockNumber(this.publicClient));
    const blockHash = (await getBlock(this.publicClient)).hash;
    const chainId = this.publicClient.chain?.id;
    if (!chainId) {
      // TODO: Improve, somehow
      throw new Error('Chain ID is not set');
    }
    return { blockNumber, blockHash, chainId };
  }
}
