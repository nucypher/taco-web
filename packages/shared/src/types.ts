import { UserOperation } from '@nucypher/nucypher-core';

import { fromHexString } from './utils';

export type ChecksumAddress = `0x${string}`;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;

export type UserOperationToSign = {
  sender: `0x${string}`;
  nonce: bigint | number;
  callData: `0x${string}` | Uint8Array;
  callGasLimit: bigint | number;
  verificationGasLimit: bigint | number;
  preVerificationGas: bigint | number;
  maxFeePerGas: bigint | number;
  maxPriorityFeePerGas: bigint | number;
  // optional fields
  factory?: `0x${string}` | undefined;
  factoryData?: `0x${string}` | Uint8Array | undefined;
  paymaster?: `0x${string}` | undefined;
  paymasterVerificationGasLimit?: bigint | number | undefined;
  paymasterPostOpGasLimit?: bigint | number | undefined;
  paymasterData?: `0x${string}` | Uint8Array | undefined;
  signature?: `0x${string}` | Uint8Array | undefined;
};

export function toCoreUserOperation(
  userOperation: UserOperationToSign,
): UserOperation {
  const userOp = new UserOperation(
    userOperation.sender,
    typeof userOperation.nonce === 'bigint'
      ? userOperation.nonce
      : BigInt(userOperation.nonce),
    userOperation.callData instanceof Uint8Array
      ? userOperation.callData
      : fromHexString(userOperation.callData),
    typeof userOperation.callGasLimit === 'bigint'
      ? userOperation.callGasLimit
      : BigInt(userOperation.callGasLimit),
    typeof userOperation.verificationGasLimit === 'bigint'
      ? userOperation.verificationGasLimit
      : BigInt(userOperation.verificationGasLimit),
    typeof userOperation.preVerificationGas === 'bigint'
      ? userOperation.preVerificationGas
      : BigInt(userOperation.preVerificationGas || 0),
    typeof userOperation.maxFeePerGas === 'bigint'
      ? userOperation.maxFeePerGas
      : BigInt(userOperation.maxFeePerGas),
    typeof userOperation.maxPriorityFeePerGas === 'bigint'
      ? userOperation.maxPriorityFeePerGas
      : BigInt(userOperation.maxPriorityFeePerGas),
  );

  // optional factory data
  if (userOperation.factory) {
    const factory_data =
      userOperation.factoryData instanceof Uint8Array
        ? userOperation.factoryData
        : fromHexString(userOperation.factoryData || '0x');

    userOp.setFactoryData(userOperation.factory, factory_data);
  }

  // optional paymaster data
  if (userOperation.paymaster) {
    const paymaster_data =
      userOperation.paymasterData instanceof Uint8Array
        ? userOperation.paymasterData
        : fromHexString(userOperation.paymasterData || '0x');
    const paymaster_verification_gas_limit =
      typeof userOperation.paymasterVerificationGasLimit === 'bigint'
        ? userOperation.paymasterVerificationGasLimit
        : BigInt(userOperation.paymasterVerificationGasLimit || 0);
    const paymaster_post_op_gas_limit =
      typeof userOperation.paymasterPostOpGasLimit === 'bigint'
        ? userOperation.paymasterPostOpGasLimit
        : BigInt(userOperation.paymasterPostOpGasLimit || 0);

    userOp.setPaymasterData(
      userOperation.paymaster,
      paymaster_verification_gas_limit,
      paymaster_post_op_gas_limit,
      paymaster_data,
    );
  }

  return userOp;
}
