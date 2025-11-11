import {
  EncryptedThresholdSignatureRequest,
  PackedUserOperation,
  SessionStaticKey,
  SessionStaticSecret,
  SignatureResponse,
  UserOperation,
} from '@nucypher/nucypher-core';
import {
  fromHexString,
  initialize,
  isPackedUserOperation,
  PackedUserOperationToSign,
  PorterClient,
  SignerInfo,
  SigningCoordinatorAgent,
  toCorePackedUserOperation,
  toCoreUserOperation,
  UserOperationToSign,
} from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContractCondition } from '../src/conditions/base/contract';
import { RpcCondition } from '../src/conditions/base/rpc';
import { CompoundCondition } from '../src/conditions/compound-condition';
import { ConditionExpression } from '../src/conditions/condition-expr';
import { setSigningCohortConditions, signUserOp } from '../src/sign';

import { mockMakeSessionKey } from './test-utils';

function toBigInt(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function checkPackedUserOpEquality(
  op1: PackedUserOperationToSign,
  op2: PackedUserOperation,
) {
  expect(op1.sender).toEqual(op2.sender);
  expect(toBigInt(op1.nonce)).toEqual(op2.nonce);

  const initCode =
    op1.initCode instanceof Uint8Array
      ? op1.initCode
      : fromHexString(op1.initCode);
  expect(initCode).toEqual(op2.initCode);

  const callData =
    op1.callData instanceof Uint8Array
      ? op1.callData
      : fromHexString(op1.callData);
  expect(callData).toEqual(op2.callData);

  const accountGasLimit =
    op1.accountGasLimit instanceof Uint8Array
      ? op1.accountGasLimit
      : fromHexString(op1.accountGasLimit);
  expect(accountGasLimit).toEqual(op2.accountGasLimits);

  expect(toBigInt(op1.preVerificationGas)).toEqual(op2.preVerificationGas);

  const gasFees =
    op1.gasFees instanceof Uint8Array
      ? op1.gasFees
      : fromHexString(op1.gasFees);
  expect(gasFees).toEqual(op2.gasFees);

  const paymasterAndData =
    op1.paymasterAndData instanceof Uint8Array
      ? op1.paymasterAndData
      : fromHexString(op1.paymasterAndData);
  expect(paymasterAndData).toEqual(op2.paymasterAndData);
}

function checkUserOpEquality(op1: UserOperationToSign, op2: UserOperation) {
  expect(op1.sender).toEqual(op2.sender);

  expect(toBigInt(op1.nonce)).toEqual(op2.nonce);

  const callData =
    op1.callData instanceof Uint8Array
      ? op1.callData
      : fromHexString(op1.callData);
  expect(callData).toEqual(op2.callData);

  expect(toBigInt(op1.callGasLimit)).toEqual(op2.callGasLimit);
  expect(toBigInt(op1.verificationGasLimit)).toEqual(op2.verificationGasLimit);
  expect(toBigInt(op1.preVerificationGas)).toEqual(op2.preVerificationGas);
  expect(toBigInt(op1.maxFeePerGas)).toEqual(op2.maxFeePerGas);
  expect(toBigInt(op1.maxPriorityFeePerGas)).toEqual(op2.maxPriorityFeePerGas);

  if (op1.factory === undefined) {
    expect(op2.factory).toBeUndefined();
  } else {
    expect(op1.factory).toEqual(op2.factory);
  }

  if (op1.factoryData === undefined) {
    expect(op2.factoryData).toBeUndefined();
  } else {
    const factoryData =
      op1.factoryData instanceof Uint8Array
        ? op1.factoryData
        : fromHexString(op1.factoryData);
    expect(factoryData).toEqual(op2.factoryData);
  }

  if (op1.paymaster === undefined) {
    expect(op2.paymaster).toBeUndefined();
  } else {
    expect(op1.paymaster).toEqual(op2.paymaster);
  }

  if (op1.paymasterVerificationGasLimit === undefined) {
    expect(op2.paymasterVerificationGasLimit).toBeUndefined();
  } else {
    expect(toBigInt(op1.paymasterVerificationGasLimit)).toEqual(
      op2.paymasterVerificationGasLimit,
    );
  }

  if (op1.paymasterPostOpGasLimit === undefined) {
    expect(op2.paymasterPostOpGasLimit).toBeUndefined();
  } else {
    expect(toBigInt(op1.paymasterPostOpGasLimit)).toEqual(
      op2.paymasterPostOpGasLimit,
    );
  }

  if (op1.paymasterData === undefined) {
    expect(op2.paymasterData).toBeUndefined();
  } else {
    const paymasterData =
      op1.paymasterData instanceof Uint8Array
        ? op1.paymasterData
        : fromHexString(op1.paymasterData);
    expect(paymasterData).toEqual(op2.paymasterData);
  }
}

describe('TACo Signing', () => {
  let porterSignUserOpMock: ReturnType<typeof vi.fn>;
  let mockProvider: ethers.providers.Provider;

  beforeAll(async () => {
    await initialize();
  });

  let signersInfo: Record<string, SignerInfo>;
  let requesterSk: SessionStaticSecret;
  let signerStaticKeys: Record<string, SessionStaticKey>;

  beforeEach(() => {
    porterSignUserOpMock = vi.fn();
    mockProvider = {} as ethers.providers.Provider;

    vi.spyOn(PorterClient.prototype, 'signUserOp').mockImplementation(
      porterSignUserOpMock,
    );
    signerStaticKeys = {
      '0xnode1': SessionStaticSecret.random().publicKey(),
      '0xnode2': SessionStaticSecret.random().publicKey(),
    };

    requesterSk = SessionStaticSecret.random();
    mockMakeSessionKey(requesterSk);

    signersInfo = {
      '0xnode1': {
        signerAddress: '0x0000000000000000000000000000000000000001',
        provider: '0xnode1',
        signingRequestStaticKey: signerStaticKeys['0xnode1'],
      },
      '0xnode2': {
        signerAddress: '0x0000000000000000000000000000000000000002',
        provider: '0xnode2',
        signingRequestStaticKey: signerStaticKeys['0xnode2'],
      },
    };

    vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue(
      Object.values(signersInfo),
    );
    vi.spyOn(SigningCoordinatorAgent, 'getThreshold').mockResolvedValue(2);
  });

  describe('toCoreUserOperation', () => {
    const userOpToSign: UserOperationToSign = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: BigInt(1),
      callData: fromHexString('0xabc'),
      callGasLimit: BigInt(131072),
      verificationGasLimit: BigInt(86016),
      preVerificationGas: BigInt(4096),
      maxFeePerGas: BigInt(2748),
      maxPriorityFeePerGas: BigInt(291),
    };

    it('should convert base fields', () => {
      const coreUserOp = toCoreUserOperation(userOpToSign);
      checkUserOpEquality(userOpToSign, coreUserOp);
    });
    it('should allow factory optional fields', () => {
      const updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        factory: '0x000000000000000000000000000000000000000A',
        factoryData: fromHexString('0xdef'),
      };
      const coreUserOp = toCoreUserOperation(updatedUserOp);
      checkUserOpEquality(updatedUserOp, coreUserOp);
    });
    it('should allow factory and no factory data', () => {
      const updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        factory: '0x000000000000000000000000000000000000000A',
      };
      const coreUserOp = toCoreUserOperation(updatedUserOp);
      checkUserOpEquality(updatedUserOp, coreUserOp);
    });
    it('should allow paymaster optional fields with paymasterData', () => {
      const updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        paymaster: '0x000000000000000000000000000000000000000C',
        paymasterVerificationGasLimit: BigInt(50000),
        paymasterPostOpGasLimit: BigInt(30000),
        paymasterData: fromHexString('0xdef'),
      };
      const coreUserOp = toCoreUserOperation(updatedUserOp);
      checkUserOpEquality(updatedUserOp, coreUserOp);
    });
    it('should allow paymaster optional fields with no paymasterData', () => {
      const updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        paymaster: '0x000000000000000000000000000000000000000C',
        paymasterVerificationGasLimit: BigInt(50000),
        paymasterPostOpGasLimit: BigInt(30000),
      };
      const coreUserOp = toCoreUserOperation(updatedUserOp);
      checkUserOpEquality(updatedUserOp, coreUserOp);
    });
    it('should raise when paymaster specified but other required fields are not present', () => {
      let updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        paymaster: '0x000000000000000000000000000000000000000C',
        // missing required paymasterVerificationGasLimit and paymasterPostOpGasLimit
      };
      expect(() => toCoreUserOperation(updatedUserOp)).toThrow(
        'paymasterVerificationGasLimit is required when paymaster is set',
      );

      updatedUserOp = {
        ...updatedUserOp,
        paymasterVerificationGasLimit: BigInt(50000),
        // missing required paymasterPostOpGasLimit
      };
      expect(() => toCoreUserOperation(updatedUserOp)).toThrow(
        'paymasterPostOpGasLimit is required when paymaster is set',
      );
    });
    it('should handle alternative types: number and byte fields', () => {
      const updatedUserOp: UserOperationToSign = {
        ...userOpToSign,
        // number instead of bigint, hex instead of byte array
        nonce: 1,
        callData: '0xabc',
        callGasLimit: 131072,
        verificationGasLimit: 86016,
        preVerificationGas: 4096,
        maxFeePerGas: 2748,
        maxPriorityFeePerGas: 291,
        // include optional fields
        factory: '0x000000000000000000000000000000000000000A',
        factoryData: '0xabc',

        paymaster: '0x000000000000000000000000000000000000000C',
        // number instead of big int
        paymasterVerificationGasLimit: 50000,
        paymasterPostOpGasLimit: 30000,
        paymasterData: '0xdef',
      };
      const coreUserOp = toCoreUserOperation(updatedUserOp);
      checkUserOpEquality(updatedUserOp, coreUserOp);
    });
  });
  describe('toCorePackedUserOperation', () => {
    const packedUserOpToSign: PackedUserOperationToSign = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: BigInt(123),
      initCode: fromHexString('0xabc'),
      callData: fromHexString('0xdef'),
      accountGasLimit: fromHexString('0x01020304'),
      preVerificationGas: BigInt(101112),
      gasFees: fromHexString('0x05060708'),
      paymasterAndData: fromHexString('0x090a0b0c'),
    };

    it('should convert base fields', () => {
      const corePackedUserOp = toCorePackedUserOperation(packedUserOpToSign);
      checkPackedUserOpEquality(packedUserOpToSign, corePackedUserOp);
    });
    it('should handle alternative types: number and byte fields', () => {
      const updatedPackedUserOp: PackedUserOperationToSign = {
        // number instead of bigint, hex instead of byte array
        ...packedUserOpToSign,
        nonce: 1,
        initCode: '0xabc',
        callData: '0xdef',
        accountGasLimit: '0x01020304',
        preVerificationGas: 4096,
        gasFees: '0x05060708',
        paymasterAndData: '0x090a0b0c',
      };
      const corePackedUserOp = toCorePackedUserOperation(updatedPackedUserOp);
      checkPackedUserOpEquality(updatedPackedUserOp, corePackedUserOp);
    });
  });

  describe('signUserOp', () => {
    const userOp: UserOperationToSign = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: BigInt(1),
      callData: fromHexString('0xabc'),
      callGasLimit: BigInt(131072),
      verificationGasLimit: BigInt(86016),
      preVerificationGas: BigInt(4096),
      maxFeePerGas: BigInt(2748),
      maxPriorityFeePerGas: BigInt(291),
    };
    const packedUserOp: PackedUserOperationToSign = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: BigInt(1),
      initCode: fromHexString('0xabc'),
      callData: fromHexString('0xdef'),
      accountGasLimit: fromHexString('0x01020304'),
      preVerificationGas: BigInt(101112),
      gasFees: fromHexString('0x05060708'),
      paymasterAndData: fromHexString('0x090a0b0c'),
    };

    const chainId = 1;
    const cohortId = 5;
    const porterUris = [fakePorterUri];
    const aaVersion = '0.8.0';
    const threshold = 2;

    it.each([
      ['0.8.0', userOp],
      ['0.8.0', packedUserOp],
      ['mdt', userOp],
      ['mdt', packedUserOp],
    ])(
      'should sign user operation and packed user operations for valid aa versions',
      async (
        validAAVersion: string,
        userOp: UserOperationToSign | PackedUserOperationToSign,
      ) => {
        const encryptedResponses = {
          '0xnode1': new SignatureResponse(
            signersInfo['0xnode1'].signerAddress,
            fromHexString('0xa1'),
            fromHexString('0xdead'),
            0,
          ).encrypt(
            requesterSk.deriveSharedSecret(
              signersInfo['0xnode1'].signingRequestStaticKey,
            ),
          ),
          '0xnode2': new SignatureResponse(
            signersInfo['0xnode2'].signerAddress,
            fromHexString('0xa1'),
            fromHexString('0xbeef'),
            0,
          ).encrypt(
            requesterSk.deriveSharedSecret(
              signersInfo['0xnode2'].signingRequestStaticKey,
            ),
          ),
        };
        const errors = {};

        porterSignUserOpMock.mockResolvedValue({
          encryptedResponses,
          errors,
        });

        const result = await signUserOp(
          mockProvider,
          'lynx',
          cohortId,
          chainId,
          userOp,
          validAAVersion,
          undefined,
          porterUris,
        );

        expect(porterSignUserOpMock).toHaveBeenCalledWith(
          {
            '0xnode1': expect.any(EncryptedThresholdSignatureRequest),
            '0xnode2': expect.any(EncryptedThresholdSignatureRequest),
          },
          threshold,
        );

        const call = porterSignUserOpMock.mock.calls.at(-1)!;
        const [op] = call;

        const nodes = ['0xnode1', '0xnode2'];
        nodes.forEach((node) => {
          const element = op[node];
          const decryptedRequest = element.decrypt(
            requesterSk.deriveSharedSecret(
              signersInfo[node].signingRequestStaticKey,
            ),
          );

          if (isPackedUserOperation(userOp)) {
            checkPackedUserOpEquality(userOp, decryptedRequest.packedUserOp);
          } else {
            checkUserOpEquality(userOp, decryptedRequest.userOp);
          }
          expect(decryptedRequest.aaVersion).toEqual(validAAVersion);
          expect(decryptedRequest.cohortId).toEqual(cohortId);
          expect(decryptedRequest.chainId).toEqual(BigInt(chainId));
          expect(decryptedRequest.context).toBeUndefined();
        });

        expect(result).toEqual({
          messageHash: '0xa1',
          aggregatedSignature: '0xdeadbeef',
          signingResults: {
            '0xnode1': {
              messageHash: '0xa1',
              signature: '0xdead',
              signerAddress: signersInfo['0xnode1'].signerAddress,
            },
            '0xnode2': {
              messageHash: '0xa1',
              signature: '0xbeef',
              signerAddress: signersInfo['0xnode2'].signerAddress,
            },
          },
        });
      },
    );

    it('should handle only errors in Porter response', async () => {
      // Mock a response with errors from Porter
      const encryptedResponses = {};
      const errors = {
        '0xnode1': 'Failed to sign',
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        encryptedResponses,
        errors,
      });

      await expect(
        signUserOp(
          mockProvider,
          'lynx',
          cohortId,
          chainId,
          userOp,
          aaVersion,
          undefined,
          porterUris,
        ),
      ).rejects.toThrow(
        `Threshold of signatures not met; TACo signing failed with errors: ${JSON.stringify(errors)}`,
      );

      expect(porterSignUserOpMock).toHaveBeenCalledWith(
        {
          '0xnode1': expect.any(EncryptedThresholdSignatureRequest),
          '0xnode2': expect.any(EncryptedThresholdSignatureRequest),
        },
        threshold,
      );
      const call = porterSignUserOpMock.mock.calls.at(-1)!;
      const [op] = call;

      const nodes = ['0xnode1', '0xnode2'];
      nodes.forEach((node) => {
        const element = op[node];
        const decryptedRequest = element.decrypt(
          requesterSk.deriveSharedSecret(
            signersInfo[node].signingRequestStaticKey,
          ),
        );
        checkUserOpEquality(userOp, decryptedRequest.userOp);
        expect(decryptedRequest.aaVersion).toEqual(aaVersion);
        expect(decryptedRequest.cohortId).toEqual(cohortId);
        expect(decryptedRequest.chainId).toEqual(BigInt(chainId));
        expect(decryptedRequest.context).toBeUndefined();
      });
    });
    it('should handle insufficient signatures in Porter response', async () => {
      const encryptedResponses = {
        '0xnode1': new SignatureResponse(
          signersInfo['0xnode1'].signerAddress,
          fromHexString('0xa1'),
          fromHexString('0xdead'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode1'].signingRequestStaticKey,
          ),
        ),
      };

      const errors = {
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        encryptedResponses,
        errors,
      });

      await expect(
        signUserOp(
          mockProvider,
          'lynx',
          cohortId,
          chainId,
          userOp,
          aaVersion,
          undefined,
          porterUris,
        ),
      ).rejects.toThrow(
        `Threshold of signatures not met; TACo signing failed with errors: ${JSON.stringify(errors)}`,
      );
    });

    it('should handle insufficient matched hashes in Porter response', async () => {
      // use 3 signers - it matters based on how mismatched hashes are handled
      const node3SecretKey = SessionStaticSecret.random();
      vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue([
        ...Object.values(signersInfo),
        {
          signerAddress: '0x0000000000000000000000000000000000000003',
          provider: '0xnode3',
          signingRequestStaticKey: node3SecretKey.publicKey(),
        },
      ]);

      const encryptedResponses = {
        '0xnode1': new SignatureResponse(
          signersInfo['0xnode1'].signerAddress,
          fromHexString('0xa1'),
          fromHexString('0xdead'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode1'].signingRequestStaticKey,
          ),
        ),
        '0xnode2': new SignatureResponse(
          signersInfo['0xnode2'].signerAddress,
          fromHexString('0xa2'),
          fromHexString('0xbeef'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode2'].signingRequestStaticKey,
          ),
        ),
        '0xnode3': new SignatureResponse(
          '0x0000000000000000000000000000000000000003',
          fromHexString('0xa3'),
          fromHexString('0xcafe'),
          0,
        ).encrypt(requesterSk.deriveSharedSecret(node3SecretKey.publicKey())),
      };
      const errors = {};

      porterSignUserOpMock.mockResolvedValue({
        encryptedResponses,
        errors,
      });

      await expect(
        signUserOp(
          mockProvider,
          'lynx',
          cohortId,
          chainId,
          userOp,
          aaVersion,
          undefined,
          porterUris,
        ),
      ).rejects.toThrowError(/multiple mismatched hashes/);
    });

    it('properly handles threshold of 1 signature from Porter', async () => {
      vi.spyOn(SigningCoordinatorAgent, 'getThreshold').mockResolvedValue(1);

      const encryptedResponses = {
        '0xnode1': new SignatureResponse(
          signersInfo['0xnode1'].signerAddress,
          fromHexString('0xa1'),
          fromHexString('0xdead'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode1'].signingRequestStaticKey,
          ),
        ),
      };
      const errors = {
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        encryptedResponses,
        errors,
      });

      const result = await signUserOp(
        mockProvider,
        'lynx',
        cohortId,
        chainId,
        userOp,
        aaVersion,
        undefined,
        porterUris,
      );

      expect(result).toEqual({
        messageHash: '0xa1',
        aggregatedSignature: '0xdead',
        signingResults: {
          '0xnode1': {
            messageHash: '0xa1',
            signature: '0xdead',
            signerAddress: signersInfo['0xnode1'].signerAddress,
          },
        },
      });
    });

    it('ignore errors/mismatched hashes if threshold of matching hashes and signatures from Porter', async () => {
      const node3SecretKey = SessionStaticSecret.random();
      const node4SecretKey = SessionStaticSecret.random();
      vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue([
        ...Object.values(signersInfo),
        {
          signerAddress: '0x0000000000000000000000000000000000000003',
          provider: '0xnode3',
          signingRequestStaticKey: node3SecretKey.publicKey(),
        },
        {
          signerAddress: '0x000000000000000000000000000000000000004',
          provider: '0xnode4',
          signingRequestStaticKey: node4SecretKey.publicKey(),
        },
      ]);

      const encryptedResponses = {
        '0xnode1': new SignatureResponse(
          signersInfo['0xnode1'].signerAddress,
          fromHexString('0xa1'), // matching hash
          fromHexString('0xdead'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode1'].signingRequestStaticKey,
          ),
        ),
        '0xnode2': new SignatureResponse(
          signersInfo['0xnode2'].signerAddress,
          fromHexString('0xa2'),
          fromHexString('0xbeef'),
          0,
        ).encrypt(
          requesterSk.deriveSharedSecret(
            signersInfo['0xnode2'].signingRequestStaticKey,
          ),
        ),
        '0xnode3': new SignatureResponse(
          '0x0000000000000000000000000000000000000003',
          fromHexString('0xa3'),
          fromHexString('0xcafe'),
          0,
        ).encrypt(requesterSk.deriveSharedSecret(node3SecretKey.publicKey())),
        '0xnode4': new SignatureResponse(
          '0x0000000000000000000000000000000000000004',
          fromHexString('0xa1'), // matching hash
          fromHexString('0xcafe'),
          0,
        ).encrypt(requesterSk.deriveSharedSecret(node4SecretKey.publicKey())),
      };
      const errors = {
        '0x7890': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        encryptedResponses,
        errors,
      });

      const result = await signUserOp(
        mockProvider,
        'lynx',
        cohortId,
        chainId,
        userOp,
        aaVersion,
        undefined,
        porterUris,
      );

      expect(result).toEqual({
        messageHash: '0xa1',
        aggregatedSignature: '0xdeadcafe', // from node1 and node4
        signingResults: {
          '0xnode1': {
            messageHash: '0xa1',
            signature: '0xdead',
            signerAddress: signersInfo['0xnode1'].signerAddress,
          },
          '0xnode4': {
            messageHash: '0xa1',
            signature: '0xcafe',
            signerAddress: '0x0000000000000000000000000000000000000004',
          },
        },
      });
    });
  });

  describe('setSigningCohortConditions', () => {
    let mockSigner: ethers.Signer;
    let mockProvider: ethers.providers.JsonRpcProvider;
    let setSigningCohortConditionsSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockProvider = {} as ethers.providers.JsonRpcProvider;
      mockSigner = {} as ethers.Signer;
      setSigningCohortConditionsSpy = vi.fn();

      vi.spyOn(
        SigningCoordinatorAgent,
        'setSigningCohortConditions',
      ).mockImplementation(setSigningCohortConditionsSpy);
    });

    it('should set signing cohort conditions successfully', async () => {
      const domain = 'lynx';
      const cohortId = 1;
      const chainId = 11155111;
      const mockTransaction = { hash: '0x123' } as ethers.ContractTransaction;

      // Create a real ConditionExpression with RPC condition
      const rpcCondition = new RpcCondition({
        chain: chainId,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>',
          value: BigInt(0),
        },
      });

      const conditionExpression = new ConditionExpression(rpcCondition);
      const expectedJson = conditionExpression.toJson();
      const expectedBytes = ethers.utils.toUtf8Bytes(expectedJson);

      setSigningCohortConditionsSpy.mockResolvedValue(mockTransaction);

      const result = await setSigningCohortConditions(
        mockProvider,
        domain,
        rpcCondition,
        cohortId,
        chainId,
        mockSigner,
      );

      expect(setSigningCohortConditionsSpy).toHaveBeenCalledWith(
        mockProvider,
        domain,
        cohortId,
        chainId,
        expectedBytes,
        mockSigner,
      );
      expect(result).toBe(mockTransaction);
    });

    it('should handle complex condition expressions', async () => {
      const domain = 'lynx';
      const cohortId = 1;
      const chainId = 11155111;
      const mockTransaction = { hash: '0x456' } as ethers.ContractTransaction;

      // Create a real compound ConditionExpression
      const rpcCondition = new RpcCondition({
        chain: chainId,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>',
          value: BigInt(0),
        },
      });

      const contractCondition = new ContractCondition({
        contractAddress: '0x1234567890123456789012345678901234567890',
        chain: chainId,
        standardContractType: 'ERC20',
        method: 'balanceOf',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '>=',
          value: BigInt(1000),
        },
      });

      const compoundCondition = CompoundCondition.and([
        rpcCondition,
        contractCondition,
      ]);
      const conditionExpression = new ConditionExpression(compoundCondition);
      const expectedJson = conditionExpression.toJson();
      const expectedBytes = ethers.utils.toUtf8Bytes(expectedJson);

      setSigningCohortConditionsSpy.mockResolvedValue(mockTransaction);

      const result = await setSigningCohortConditions(
        mockProvider,
        domain,
        compoundCondition,
        cohortId,
        chainId,
        mockSigner,
      );

      expect(setSigningCohortConditionsSpy).toHaveBeenCalledWith(
        mockProvider,
        domain,
        cohortId,
        chainId,
        expectedBytes,
        mockSigner,
      );
      expect(result).toBe(mockTransaction);
    });

    it('should handle errors from SigningCoordinatorAgent', async () => {
      const domain = 'lynx';
      const cohortId = 999;
      const chainId = 11155111;

      // Create a real ConditionExpression
      const rpcCondition = new RpcCondition({
        chain: chainId,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>',
          value: BigInt(0),
        },
      });

      const conditionExpression = new ConditionExpression(rpcCondition);
      const expectedJson = conditionExpression.toJson();
      const expectedBytes = ethers.utils.toUtf8Bytes(expectedJson);

      setSigningCohortConditionsSpy.mockRejectedValue(
        new Error('Cohort not found'),
      );

      await expect(
        setSigningCohortConditions(
          mockProvider,
          domain,
          rpcCondition,
          cohortId,
          chainId,
          mockSigner,
        ),
      ).rejects.toThrow('Cohort not found');

      expect(setSigningCohortConditionsSpy).toHaveBeenCalledWith(
        mockProvider,
        domain,
        cohortId,
        chainId,
        expectedBytes,
        mockSigner,
      );
    });
  });
});
