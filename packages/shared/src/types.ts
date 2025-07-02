import { ethers } from 'ethers';

export type ChecksumAddress = `0x${string}`;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;

export type UserOperation = {
  sender: string;
  nonce: string;
  factory: string;
  factoryData: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymaster: string;
  paymasterVerificationGasLimit: string;
  paymasterPostOpGasLimit: string;
  paymasterData: string;
  signature: string;
};

export class UserOperationSignatureRequest {
  constructor(
    private userOp: ReturnType<typeof convertUserOperationToPython>,
    private aaVersion: string,
    private cohortId: number,
    private chainId: number,
    private context: unknown = {},
    private signatureType: string = 'userop',
  ) {}

  toBytes(): Uint8Array {
    const data = {
      user_op: JSON.stringify(this.userOp),
      aa_version: this.aaVersion,
      cohort_id: this.cohortId,
      chain_id: this.chainId,
      context: this.context,
      signature_type: this.signatureType,
    };
    return new TextEncoder().encode(JSON.stringify(data));
  }
}

function normalizeAddress(address: string): string | null {
  if (!address || address === '0x') {
    return null;
  }

  try {
    // Use ethers to get the checksummed address - this will throw on invalid addresses
    return ethers.utils.getAddress(address);
  } catch (error) {
    // Re-throw the error to fail fast on invalid addresses
    throw new Error(
      `Invalid address: ${address}. ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export function convertUserOperationToPython(userOp: UserOperation) {
  return {
    sender: normalizeAddress(userOp.sender),
    nonce: parseInt(userOp.nonce, 16) || 0,
    factory: normalizeAddress(userOp.factory),
    factory_data: userOp.factoryData || '0x',
    call_data: userOp.callData || '0x',
    call_gas_limit: parseInt(userOp.callGasLimit, 16) || 0,
    verification_gas_limit: parseInt(userOp.verificationGasLimit, 16) || 0,
    pre_verification_gas: parseInt(userOp.preVerificationGas, 16) || 0,
    max_fee_per_gas: parseInt(userOp.maxFeePerGas, 16) || 0,
    max_priority_fee_per_gas: parseInt(userOp.maxPriorityFeePerGas, 16) || 0,
    paymaster: normalizeAddress(userOp.paymaster),
    paymaster_verification_gas_limit:
      parseInt(userOp.paymasterVerificationGasLimit, 16) || 0,
    paymaster_post_op_gas_limit:
      parseInt(userOp.paymasterPostOpGasLimit, 16) || 0,
    paymaster_data: userOp.paymasterData || '0x',
    signature: userOp.signature || '0x',
  };
}
