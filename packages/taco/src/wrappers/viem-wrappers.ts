import { ethers } from 'ethers';

// Dynamic viem types (available only when viem is installed)
// instead of `import type { Account, PublicClient, WalletClient } from 'viem';`
type Account = any;
type PublicClient = any;
type WalletClient = any;

/**
 * Checks if viem is available and throws a helpful error if not
 */
function checkViemAvailability(): void {
  try {
    // Try to actually require viem to check if it's available
    require('viem');
  } catch (error) {
    throw new Error(
      'viem is required for viem wrapper functions. Install it with: npm install viem',
    );
  }
}

/**
 * Dynamically imports viem types for runtime type checking
 */
async function importViem() {
  checkViemAvailability();
  return await import('viem');
}

/**
 * A provider that wraps viem PublicClient to work with ethers.js
 */
class ViemWrappedProvider {
  private viemPublicClient: PublicClient;

  constructor(viemPublicClient: PublicClient) {
    this.viemPublicClient = viemPublicClient;
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    const chainId = await this.viemPublicClient.getChainId();
    return {
      name: this.viemPublicClient.chain?.name || `chain-${chainId}`,
      chainId,
    };
  }

  async getBlockNumber(): Promise<number> {
    return Number(await this.viemPublicClient.getBlockNumber());
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await this.viemPublicClient.getGasPrice();
    return ethers.BigNumber.from(gasPrice.toString());
  }

  async getBalance(address: string, blockTag?: string | number): Promise<ethers.BigNumber> {
    const balance = await this.viemPublicClient.getBalance({
      address: address as `0x${string}`,
    });
    return ethers.BigNumber.from(balance.toString());
  }

  async getTransactionCount(address: string, blockTag?: string | number): Promise<number> {
    return await this.viemPublicClient.getTransactionCount({
      address: address as `0x${string}`,
    });
  }

  async getCode(address: string, blockTag?: string | number): Promise<string> {
    return await this.viemPublicClient.getCode({
      address: address as `0x${string}`,
    });
  }

  async call(transaction: ethers.providers.TransactionRequest, blockTag?: string | number): Promise<string> {
    const result = await this.viemPublicClient.call({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
    });
    // viem returns {data: "0x..."} but ethers expects just "0x..."
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }

  async estimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
    const gas = await this.viemPublicClient.estimateGas({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
    });
    return ethers.BigNumber.from(gas.toString());
  }

  async getBlock(blockHashOrBlockTag: string | number): Promise<any> {
    if (typeof blockHashOrBlockTag === 'string' && blockHashOrBlockTag.startsWith('0x')) {
      return await this.viemPublicClient.getBlock({
        blockHash: blockHashOrBlockTag as `0x${string}`,
      });
    } else {
      return await this.viemPublicClient.getBlock({
        blockNumber: BigInt(blockHashOrBlockTag),
      });
    }
  }

  async getTransaction(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.getTransaction({
      hash: transactionHash as `0x${string}`,
    });
  }

  async getTransactionReceipt(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
  }

  async waitForTransaction(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
  }

  // Additional methods that ethers contracts might need
  async resolveName(name: string): Promise<string | null> {
    return null; // ENS resolution not implemented
  }

  async lookupAddress(address: string): Promise<string | null> {
    return null; // Reverse ENS lookup not implemented
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const gasPrice = await this.getGasPrice();
    return {
      gasPrice,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      lastBaseFeePerGas: null,
    };
  }

  // Mark this as a viem wrapped provider
  _isViemWrappedProvider = true;
  
  // Additional required Provider methods (stubs for compatibility)
  async getStorageAt(address: string, position: string, blockTag?: string | number): Promise<string> {
    throw new Error('getStorageAt not implemented in viem wrapper');
  }

  async sendTransaction(signedTransaction: string): Promise<any> {
    throw new Error('sendTransaction not implemented in viem wrapper');
  }

  async getBlockWithTransactions(blockHashOrBlockTag: string | number): Promise<any> {
    throw new Error('getBlockWithTransactions not implemented in viem wrapper');
  }

  async getLogs(filter: any): Promise<any[]> {
    throw new Error('getLogs not implemented in viem wrapper');
  }

  // Ethers provider interface compatibility
  connection?: any;
  _network?: ethers.providers.Network;
  _isProvider = true;
  
  // Additional stubs for compatibility
  async on(): Promise<any> { return this; }
  async once(): Promise<any> { return this; }
  async off(): Promise<any> { return this; }
  async emit(): Promise<any> { return false; }
  async listenerCount(): Promise<number> { return 0; }
  async listeners(): Promise<any[]> { return []; }
  async removeAllListeners(): Promise<any> { return this; }
  async addListener(): Promise<any> { return this; }
  async removeListener(): Promise<any> { return this; }
  
  get _viemPublicClient() {
    return this.viemPublicClient;
  }
}

/**
 * Creates an ethers.js provider from a viem public client
 *
 * @param viemPublicClient - Viem PublicClient to wrap as ethers provider
 * @returns ethers.providers.Provider compatible with TACo SDK
 */
export function createEthersProvider(
  viemPublicClient: PublicClient,
): ethers.providers.Provider {
  // Check if viem is available
  checkViemAvailability();

  return new ViemWrappedProvider(viemPublicClient) as unknown as ethers.providers.Provider;
}

/**
 * Creates an ethers.js signer from a viem account and provider
 *
 * @param viemAccount - The viem account (from wallet client or account)
 * @param provider - Ethers provider (can be created with createEthersProvider)
 * @returns ethers.Signer compatible with TACo SDK
 */
export function createEthersSigner(
  viemAccount: Account,
  provider: ethers.providers.Provider,
): ethers.Signer {
  // Check if viem is available
  checkViemAvailability();

  const signerAdapter = {
    address: viemAccount.address,
    provider,

    async getAddress(): Promise<string> {
      return viemAccount.address;
    },

    async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
      const messageToSign =
        typeof message === 'string'
          ? message
          : typeof message === 'object' && message.constructor === Uint8Array
            ? new TextDecoder().decode(message as Uint8Array)
            : String(message);

      if (!viemAccount.signMessage) {
        throw new Error('Account does not support message signing');
      }
      return await viemAccount.signMessage({ message: messageToSign });
    },

    async signTransaction(
      transaction: ethers.providers.TransactionRequest,
    ): Promise<string> {
      if (!viemAccount.signTransaction) {
        throw new Error('Account does not support transaction signing');
      }

      // Convert ethers transaction to viem format
      const viemTx: any = {
        to: transaction.to as `0x${string}`,
        value: transaction.value
          ? BigInt(transaction.value.toString())
          : undefined,
        data: transaction.data as `0x${string}`,
        gas: transaction.gasLimit
          ? BigInt(transaction.gasLimit.toString())
          : undefined,
        gasPrice: transaction.gasPrice
          ? BigInt(transaction.gasPrice.toString())
          : undefined,
        nonce: transaction.nonce ? Number(transaction.nonce) : undefined,
      };

      return await viemAccount.signTransaction(viemTx);
    },

    async signTypedData(
      domain: any,
      types: Record<string, any>,
      message: Record<string, any>,
    ): Promise<string> {
      if (!viemAccount.signTypedData) {
        throw new Error('Account does not support typed data signing');
      }

      return await viemAccount.signTypedData({
        domain,
        types,
        message,
        primaryType:
          Object.keys(types).find((key) => key !== 'EIP712Domain') || 'Message',
      });
    },

    connect(provider: ethers.providers.Provider): ethers.Signer {
      return createEthersSigner(viemAccount, provider);
    },

    // Additional signer methods for ethers compatibility
    async getBalance() {
      const balance = await provider.getBalance(viemAccount.address);
      return balance;
    },

    async getTransactionCount() {
      return await provider.getTransactionCount(viemAccount.address);
    },

    async estimateGas(transaction: ethers.providers.TransactionRequest) {
      return await provider.estimateGas(transaction);
    },

    async call(transaction: ethers.providers.TransactionRequest) {
      return await provider.call(transaction);
    },

    async sendTransaction(transaction: ethers.providers.TransactionRequest) {
      throw new Error(
        'sendTransaction not implemented for viem wrapper - use signTransaction instead',
      );
    },

    // Type identification
    _isSigner: true,
    _isViemWrappedSigner: true,
    _viemAccount: viemAccount,
  };

  return signerAdapter as unknown as ethers.Signer;
}

/**
 * Convenience function to create both provider and signer from viem clients
 *
 * @param viemPublicClient - Viem public client for provider functionality
 * @param viemWalletClient - Viem wallet client for signing functionality
 * @returns Object with ethers provider and signer
 */
export function createEthersFromViem(
  viemPublicClient: PublicClient,
  viemWalletClient: WalletClient,
) {
  // Check if viem is available
  checkViemAvailability();

  if (!viemWalletClient.account) {
    throw new Error('Wallet client must have an account attached');
  }

  const provider = createEthersProvider(viemPublicClient);
  const signer = createEthersSigner(viemWalletClient.account, provider);

  return { provider, signer };
}
