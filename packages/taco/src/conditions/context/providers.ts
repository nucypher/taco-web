import { bytesToHex, WalletClient } from 'viem';
import { getBlock, getBlockNumber, signTypedData } from 'viem/actions';

const ERR_NO_ACCOUNT = 'No account found';
const ERR_NO_CHAIN_ID = 'No chain ID found';

const makeSalt = () => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(randomBytes);
};

interface Eip712TypedData {
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

  constructor(private readonly client: WalletClient) {}

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const { address } = await this.getAccount();
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
    const account = await this.getAccount();
    const { address } = account;
    const signatureText = `I'm the owner of address ${address} as of block number ${blockNumber}`;
    const salt = makeSalt();

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
      // Normally, we would pass an account address here, but viem needs the account object to figure out whether
      // to sign locally or to call JSON-RPC (see {'type': 'local'} field in `account`).
      account,
      types,
      primaryType: 'EIP712Domain',
      domain,
      message,
    } as const;
    const signature = await signTypedData(this.client, typedData);

    const formattedTypedData = {
      ...typedData,
      primaryType: 'Wallet',
      types: {
        ...typedData.types,
        EIP712Domain: [
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
        ],
      },
    };

    return { signature, typedData: formattedTypedData, address };
  }

  private async getAccount() {
    const account = this.client.account;
    if (!account) {
      throw new Error(ERR_NO_ACCOUNT);
    }
    return account;
  }

  private async getChainData(): Promise<ChainData> {
    const blockNumber = Number(await getBlockNumber(this.client));
    const blockHash = (await getBlock(this.client)).hash;
    const chainId = this.client.chain?.id;
    if (!chainId) {
      throw new Error(ERR_NO_CHAIN_ID);
    }
    return { blockNumber, blockHash, chainId };
  }
}
