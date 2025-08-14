// Shared viem utilities for TACo packages
// This provides consistent viem integration utilities across packages

// Dynamic imports and types for viem compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WalletClient = any;

let isViemAvailable = false;

/**
 * Check if viem is available and throw helpful error if not
 */
export async function checkViemAvailability(): Promise<void> {
  if (isViemAvailable) {
    return;
  }
  try {
    await import('viem');
    isViemAvailable = true;
  } catch (error) {
    throw new Error(
      'viem is required for viem wrapper functions. Install it with: npm install viem',
    );
  }
}

/**
 * Reset viem availability flag (primarily for testing)
 */
export function resetViemAvailability(): void {
  isViemAvailable = false;
}
