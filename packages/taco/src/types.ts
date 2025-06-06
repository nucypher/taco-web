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
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
};
