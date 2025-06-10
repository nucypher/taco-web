// Re-exporting core types to avoid confusion with taco types
export {
  Conditions as CoreConditions,
  Context as CoreContext,
} from '@nucypher/nucypher-core';

// Signing types
export type SignResult = {
  digest: string;      // Final hash signed by the node
  aggregatedSignature: string;  // Combined signature from all signers
  signingResults: {    // Individual signing results from each participant
    [ursulaAddress: string]: [signerAddress: string, signatureB64: string]
  };
  type: string;        // Signature type (e.g. "eip712", "userOp:zerodev")
};

export type SigningOptions = {
  optimistic?: boolean;        // Whether to proceed with signing even if some nodes are unavailable
  returnAggregated?: boolean;  // Whether to return the aggregated signature
};

export type UserOperation = {
  sender: string;                    // The Account making the UserOperation
  nonce: string;                     // Anti-replay parameter
  factory: string;                   // Account Factory for new Accounts OR 0x7702 flag for EIP-7702 Accounts, otherwise address(0)
  factoryData: string;               // data for the Account Factory if factory is provided OR EIP-7702 initialization data, or empty array
  callData: string;                  // The data to pass to the sender during the main execution call
  callGasLimit: string;              // The amount of gas to allocate the main execution call
  verificationGasLimit: string;      // The amount of gas to allocate for the verification step
  preVerificationGas: string;        // Extra gas to pay the bundler
  maxFeePerGas: string;              // Maximum fee per gas (similar to EIP-1559 max_fee_per_gas)
  maxPriorityFeePerGas: string;      // Maximum priority fee per gas (similar to EIP-1559 max_priority_fee_per_gas)
  paymaster: string;                 // Address of paymaster contract, (or empty, if the sender pays for gas by itself)
  paymasterVerificationGasLimit: string;  // The amount of gas to allocate for the paymaster validation code (only if paymaster exists)
  paymasterPostOpGasLimit: string;   // The amount of gas to allocate for the paymaster post-operation code (only if paymaster exists)
  paymasterData: string;             // Data for paymaster (only if paymaster exists)
  signature: string;                 // Data passed into the sender to verify authorization
};
