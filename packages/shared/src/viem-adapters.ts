import { ethers } from 'ethers';

import { type TacoProvider, type TacoSigner } from './taco-interfaces';
import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  type WalletClient,
} from './viem-utils';

/**
 * Viem TACo Provider
 *
 * This class implements the TacoProvider interface directly using viem clients.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
export class ViemTacoProvider implements TacoProvider {
  protected viemPublicClient: PublicClient;

  // Ethers.js compatibility property for contract validation
  readonly _isProvider = true;
  readonly _network: Promise<ethers.providers.Network>;
  readonly formatter?: undefined = undefined;

  constructor(viemPublicClient: PublicClient) {
    this.viemPublicClient = viemPublicClient;
    // Initialize network for ethers compatibility
    this._network = this.getNetwork();
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    const chainId = await this.viemPublicClient.getChainId();
    const name = this.viemPublicClient.chain?.name || `chain-${chainId}`;
    return {
      name,
      chainId,
    };
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    const result = await this.viemPublicClient.call({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
    });
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }
}

/**
 * Viem TACo Signer
 *
 * This class implements the TacoSigner interface directly using viem accounts.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
export class ViemTacoSigner implements TacoSigner {
  protected viemAccount: Account;
  public readonly provider?: TacoProvider | undefined;

  constructor(viemAccount: Account, provider?: TacoProvider | undefined) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await checkViemAvailability();
    if (!this.viemAccount.signMessage) {
      throw new Error('Account does not support message signing');
    }
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }
}

/**
 * Create a TACo provider from viem PublicClient
 *
 * This function creates a TacoProvider directly from a viem client.
 */
export async function createTacoProvider(
  viemPublicClient: PublicClient,
): Promise<TacoProvider> {
  await checkViemAvailability();
  return new ViemTacoProvider(viemPublicClient);
}

/**
 * Create a TACo signer from viem Account
 *
 * This function creates a TacoSigner directly from a viem account.
 *
 * @param viemAccount - Viem account for signing operations
 * @param provider - Optional TACo provider. If not provided, some operations will require a provider
 */
export async function createTacoSigner(
  viemAccount: Account,
  provider?: TacoProvider,
): Promise<TacoSigner> {
  await checkViemAvailability();
  return new ViemTacoSigner(viemAccount, provider);
}

/**
 * Convenience function to create both provider and signer adapters from viem clients
 *
 * @param viemPublicClient - Viem public client for provider functionality
 * @param viemWalletClient - Viem wallet client for signing functionality
 * @returns Object with TACo provider and signer adapters
 */
export async function createTacoFromViem(
  viemPublicClient: PublicClient,
  viemWalletClient: WalletClient,
): Promise<{ provider: TacoProvider; signer: TacoSigner }> {
  await checkViemAvailability();

  if (!viemWalletClient.account) {
    throw new Error('Wallet client must have an account attached');
  }

  const provider = await createTacoProvider(viemPublicClient);
  const signer = await createTacoSigner(viemWalletClient.account, provider);

  return { provider, signer };
}
