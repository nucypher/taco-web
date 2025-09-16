/**
 * Minimal TACo signer interface.
 *
 * This interface defines only the essential methods that TACo operations require:
 * - `getAddress()`: Get the signer's address
 * - `signMessage()`: Sign a message (string or bytes)
 *
 * Future signer adapters can implement this same minimal interface
 */
export interface TACoSigner {
  /**
   * Get the address of this signer
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message
   */
  signMessage(message: string | Uint8Array): Promise<string>;
}
