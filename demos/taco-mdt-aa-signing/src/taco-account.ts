import { type Address } from 'viem';
import { toAccount } from 'viem/accounts';

/**
 * Creates a minimal Viem Account that serves as a placeholder for the MetaMask Smart Account.
 * This account is never actually used for signing - all real signing happens through the TACo network
 * via the separate signUserOpWithTaco function.
 *
 * @param cohortAddress - Address of the TACo cohort's multisig contract (used as the account address)
 * @returns A Viem Account with stub implementations
 */
export function createViemTacoAccount(cohortAddress: Address) {
  return toAccount({
    address: cohortAddress,

    // These methods are never called by the MetaMask Smart Account
    // They only need to exist to satisfy the Account interface
    async signMessage() {
      return '0x' as `0x${string}`;
    },

    async signTransaction() {
      return '0x' as `0x${string}`;
    },

    async signTypedData() {
      return '0x' as `0x${string}`;
    },
  });
}
