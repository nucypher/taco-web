import { PackedUserOperation, UserOperation } from '@nucypher/nucypher-core';

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

export type PackedUserOperationToSign = {
  sender: `0x${string}`;
  nonce: bigint | number;
  initCode: `0x${string}` | Uint8Array;
  callData: `0x${string}` | Uint8Array;
  accountGasLimits: `0x${string}` | Uint8Array;
  preVerificationGas: bigint | number;
  gasFees: `0x${string}` | Uint8Array;
  paymasterAndData: `0x${string}` | Uint8Array;
};

function getBigIntValue(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function getUint8ArrayValue(value: `0x${string}` | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : fromHexString(value);
}

export function toCoreUserOperation(
  userOperation: UserOperationToSign,
): UserOperation {
  const userOp = new UserOperation(
    userOperation.sender,
    getBigIntValue(userOperation.nonce),
    getUint8ArrayValue(userOperation.callData),
    getBigIntValue(userOperation.callGasLimit),
    getBigIntValue(userOperation.verificationGasLimit),
    getBigIntValue(userOperation.preVerificationGas),
    getBigIntValue(userOperation.maxFeePerGas),
    getBigIntValue(userOperation.maxPriorityFeePerGas),
  );

  // optional factory data
  if (userOperation.factory) {
    let factory_data = undefined;
    if (userOperation.factoryData) {
      factory_data = getUint8ArrayValue(userOperation.factoryData);
    }

    userOp.setFactoryData(userOperation.factory, factory_data);
  }

  // optional paymaster data
  if (userOperation.paymaster) {
    if (!userOperation.paymasterVerificationGasLimit) {
      throw new Error(
        'paymasterVerificationGasLimit is required when paymaster is set',
      );
    } else if (!userOperation.paymasterPostOpGasLimit) {
      throw new Error(
        'paymasterPostOpGasLimit is required when paymaster is set',
      );
    }

    userOp.setPaymasterData(
      userOperation.paymaster,
      getBigIntValue(userOperation.paymasterVerificationGasLimit),
      getBigIntValue(userOperation.paymasterPostOpGasLimit),
      userOperation.paymasterData
        ? getUint8ArrayValue(userOperation.paymasterData)
        : undefined,
    );
  }

  return userOp;
}

export function toCorePackedUserOperation(
  packedUserOperation: PackedUserOperationToSign,
): PackedUserOperation {
  const packedUserOp = new PackedUserOperation(
    packedUserOperation.sender,
    getBigIntValue(packedUserOperation.nonce),
    getUint8ArrayValue(packedUserOperation.initCode),
    getUint8ArrayValue(packedUserOperation.callData),
    getUint8ArrayValue(packedUserOperation.accountGasLimits),
    getBigIntValue(packedUserOperation.preVerificationGas),
    getUint8ArrayValue(packedUserOperation.gasFees),
    getUint8ArrayValue(packedUserOperation.paymasterAndData),
  );

  return packedUserOp;
}

export function isPackedUserOperation(
  op: UserOperationToSign | PackedUserOperationToSign,
): op is PackedUserOperationToSign {
  return 'initCode' in op && 'gasFees' in op;
}
