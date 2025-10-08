import { AuthProvider } from '../../auth-provider.js';

import { EIP1271_AUTH_METHOD, EIP1271AuthSignature } from './auth.js';

/**
 * EIP1271AuthProvider handles EIP-1271 contract-based authentication.
 * This provider manages authentication signatures from smart contracts that implement EIP-1271's `isValidSignature` solidity function.
 */
export class EIP1271AuthProvider implements AuthProvider {
  /**
   * Creates a new EIP1271AuthProvider for contract-based authentication.
   *
   * @param contractAddress - The Ethereum address of the contract implementing EIP-1271
   * @param chain - The chain ID where the contract is deployed
   * @param dataHash - The hash of the data that was signed
   * @param signature - The signature produced by the contract's signing method
   */
  constructor(
    public readonly contractAddress: string,
    public readonly chain: number,
    public readonly dataHash: string,
    public readonly signature: string,
  ) {}

  /**
   * Returns the authentication signature for the contract.
   *
   * Since contract signatures are created externally, this method simply returns
   * the existing signature and metadata rather than creating a new one.
   *
   * @returns {Promise<EIP1271AuthSignature>} The authentication signature containing:
   *   - signature: The contract-generated signature
   *   - address: The contract's address
   *   - scheme: The authentication scheme (EIP1271)
   *   - typedData: Object containing the chain ID and data hash
   */
  public async getOrCreateAuthSignature(): Promise<EIP1271AuthSignature> {
    return {
      signature: this.signature,
      address: this.contractAddress,
      scheme: EIP1271_AUTH_METHOD,
      typedData: {
        chain: this.chain,
        dataHash: this.dataHash,
      },
    };
  }
}
