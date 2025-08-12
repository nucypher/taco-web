import { ethers } from 'ethers';

// Dynamic viem types (available only when viem is installed)
type Account = any;
type PublicClient = any;

/**
 * Checks if viem is available and throws a helpful error if not
 */
function checkViemAvailability(): void {
  try {
    require('viem');
  } catch (error) {
    throw new Error(
      'viem is required for viem auth providers. Install it with: npm install viem',
    );
  }
}

/**
 * A minimal provider that wraps viem PublicClient for auth provider compatibility
 * 
 * This class implements only the methods needed for EIP4361AuthProvider to work.
 * It uses type assertion to satisfy the ethers.providers.Provider interface
 * without implementing all methods.
 */
class ViemAuthProvider {
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

  async call(transaction: ethers.providers.TransactionRequest): Promise<string> {
    const result = await this.viemPublicClient.call({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
    });
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }

  // Stub methods for ethers compatibility (not used by EIP4361AuthProvider)
  async getBlockNumber(): Promise<number> { return 0; }
  async getGasPrice(): Promise<ethers.BigNumber> { return ethers.BigNumber.from(0); }
  async getFeeData(): Promise<any> { return null; }
  async getBalance(): Promise<ethers.BigNumber> { return ethers.BigNumber.from(0); }
  async getTransactionCount(): Promise<number> { return 0; }
  async getCode(): Promise<string> { return '0x'; }
  async getStorageAt(): Promise<string> { return '0x'; }
  async sendTransaction(): Promise<any> { throw new Error('Not implemented'); }
  async getTransaction(): Promise<any> { return null; }
  async getTransactionReceipt(): Promise<any> { return null; }
  async getLogs(): Promise<any[]> { return []; }
  async getBlock(): Promise<any> { return null; }
  async getBlockWithTransactions(): Promise<any> { return null; }
  async resolveName(): Promise<string | null> { return null; }
  async lookupAddress(): Promise<string | null> { return null; }
  async waitForTransaction(): Promise<any> { return null; }
  
  // Event emitter methods (not used by EIP4361AuthProvider)
  on(): this { return this; }
  off(): this { return this; }
  removeAllListeners(): this { return this; }
  listenerCount(): number { return 0; }
  listeners(): any[] { return []; }
  emit(): boolean { return false; }
}

/**
 * A signer that wraps viem Account for auth provider compatibility
 * 
 * This class implements only the methods needed for EIP4361AuthProvider to work.
 */
class ViemAuthSigner {
  private viemAccount: Account;
  private provider: ethers.providers.Provider;

  constructor(viemAccount: Account, provider: ethers.providers.Provider) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  get address(): string {
    return this.viemAccount.address;
  }

  getAddress(): Promise<string> {
    return Promise.resolve(this.viemAccount.address);
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    checkViemAvailability();
    // Convert message to hex if it's Uint8Array
    const messageToSign = typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  async signTypedData(domain: any, types: any, message: any): Promise<string> {
    checkViemAvailability();
    return await this.viemAccount.signTypedData({
      domain,
      types,
      message,
      primaryType: Object.keys(types).find((key) => key !== 'EIP712Domain') || 'Message',
    });
  }

  getProvider(): ethers.providers.Provider {
    return this.provider;
  }

  // Required ethers signer properties and stub methods
  _isSigner = true;
  
  // Stub methods for ethers Signer compatibility (not used by EIP4361AuthProvider)
  async signTransaction(): Promise<string> { throw new Error('Not implemented'); }
  connect(): this { return this; }
  async getBalance(): Promise<ethers.BigNumber> { return ethers.BigNumber.from(0); }
  async getTransactionCount(): Promise<number> { return 0; }
  async getGasPrice(): Promise<ethers.BigNumber> { return ethers.BigNumber.from(0); }
  async getFeeData(): Promise<any> { return null; }
  async estimateGas(): Promise<ethers.BigNumber> { return ethers.BigNumber.from(0); }
  async call(): Promise<string> { return '0x'; }
  async sendTransaction(): Promise<any> { throw new Error('Not implemented'); }
  async getChainId(): Promise<number> { return (await this.provider.getNetwork()).chainId; }
  async resolveName(): Promise<string | null> { return null; }
  checkTransaction(): any { return {}; }
  populateTransaction(): Promise<any> { return Promise.resolve({}); }
}

/**
 * Create an ethers-compatible provider from viem PublicClient
 * Minimal version for auth provider compatibility
 */
export function createEthersProvider(viemPublicClient: PublicClient): ethers.providers.Provider {
  checkViemAvailability();
  // Use type assertion since we implement the minimal interface needed for auth
  return new ViemAuthProvider(viemPublicClient) as unknown as ethers.providers.Provider;
}

/**
 * Create an ethers-compatible signer from viem Account
 * Minimal version for auth provider compatibility  
 */
export function createEthersSigner(viemAccount: Account, provider: ethers.providers.Provider): ethers.Signer {
  checkViemAvailability();
  // Use type assertion since we implement the minimal interface needed for auth
  return new ViemAuthSigner(viemAccount, provider) as unknown as ethers.Signer;
}
