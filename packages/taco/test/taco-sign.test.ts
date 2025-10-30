import {
  PackedUserOperation,
  PackedUserOperationSignatureRequest,
  UserOperation,
  UserOperationSignatureRequest,
} from '@nucypher/nucypher-core';
import {
  fromHexString,
  initialize,
  isPackedUserOperation,
  PackedUserOperationToSign,
  PorterClient,
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

function getNumberValue(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function checkPackedUserOpEquality(
  op1: PackedUserOperationToSign,
  op2: PackedUserOperation,
) {
  expect(op1.sender).toEqual(op2.sender);
  expect(getNumberValue(op1.nonce)).toEqual(op2.nonce);

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

  expect(getNumberValue(op1.preVerificationGas)).toEqual(
    op2.preVerificationGas,
  );

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

  expect(getNumberValue(op1.nonce)).toEqual(op2.nonce);

  const callData =
    op1.callData instanceof Uint8Array
      ? op1.callData
      : fromHexString(op1.callData);
  expect(callData).toEqual(op2.callData);

  expect(getNumberValue(op1.callGasLimit)).toEqual(op2.callGasLimit);
  expect(getNumberValue(op1.verificationGasLimit)).toEqual(
    op2.verificationGasLimit,
  );
  expect(getNumberValue(op1.preVerificationGas)).toEqual(
    op2.preVerificationGas,
  );
  expect(getNumberValue(op1.maxFeePerGas)).toEqual(op2.maxFeePerGas);
  expect(getNumberValue(op1.maxPriorityFeePerGas)).toEqual(
    op2.maxPriorityFeePerGas,
  );

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
    expect(getNumberValue(op1.paymasterVerificationGasLimit)).toEqual(
      op2.paymasterVerificationGasLimit,
    );
  }

  if (op1.paymasterPostOpGasLimit === undefined) {
    expect(op2.paymasterPostOpGasLimit).toBeUndefined();
  } else {
    expect(getNumberValue(op1.paymasterPostOpGasLimit)).toEqual(
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

  beforeEach(() => {
    porterSignUserOpMock = vi.fn();
    mockProvider = {} as ethers.providers.Provider;

    vi.spyOn(PorterClient.prototype, 'signUserOp').mockImplementation(
      porterSignUserOpMock,
    );
    vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue([
      { operator: '0xsnr1', provider: '0xnode1', signature: '0xa' },
      { operator: '0xsnr2', provider: '0xnode2', signature: '0xb' },
    ]);
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
        const signingResults = {
          '0xnode1': {
            messageHash: '0xhash1',
            signature: '0xdead',
            signerAddress: '0xsnr1',
          },
          '0xnode2': {
            messageHash: '0xhash1',
            signature: '0xbeef',
            signerAddress: '0xsnr2',
          },
        };
        const errors = {};

        porterSignUserOpMock.mockResolvedValue({
          signingResults,
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

        if (isPackedUserOperation(userOp)) {
          expect(porterSignUserOpMock).toHaveBeenCalledWith(
            {
              '0xnode1': expect.any(PackedUserOperationSignatureRequest),
              '0xnode2': expect.any(PackedUserOperationSignatureRequest),
            },
            threshold,
          );
        } else {
          expect(porterSignUserOpMock).toHaveBeenCalledWith(
            {
              '0xnode1': expect.any(UserOperationSignatureRequest),
              '0xnode2': expect.any(UserOperationSignatureRequest),
            },
            threshold,
          );
        }

        const call = porterSignUserOpMock.mock.calls.at(-1)!;
        const [op] = call;

        const requests = [op['0xnode1'], op['0xnode2']];
        requests.forEach((element) => {
          if (isPackedUserOperation(userOp)) {
            checkPackedUserOpEquality(userOp, element.packedUserOp);
          } else {
            checkUserOpEquality(userOp, element.userOp);
          }
          expect(element.aaVersion).toEqual(validAAVersion);
          expect(element.cohortId).toEqual(cohortId);
          expect(element.chainId).toEqual(BigInt(chainId));
          expect(element.context).toBeUndefined();
        });

        expect(result).toEqual({
          messageHash: '0xhash1',
          aggregatedSignature: '0xdeadbeef',
          signingResults,
        });
      },
    );

    it('should handle only errors in Porter response', async () => {
      // Mock a response with errors from Porter
      const signingResults = {};
      const errors = {
        '0xnode1': 'Failed to sign',
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        signingResults,
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
          '0xnode1': expect.any(UserOperationSignatureRequest),
          '0xnode2': expect.any(UserOperationSignatureRequest),
        },
        threshold,
      );
      const call = porterSignUserOpMock.mock.calls.at(-1)!;
      const [op] = call;

      const requests = [op['0xnode1'], op['0xnode2']];
      requests.forEach((element) => {
        checkUserOpEquality(userOp, element.userOp);
        expect(element.aaVersion).toEqual(aaVersion);
        expect(element.cohortId).toEqual(cohortId);
        expect(element.chainId).toEqual(BigInt(chainId));
        expect(element.context).toBeUndefined();
      });
    });
    it('should handle insufficient signatures in Porter response', async () => {
      const signingResults = {
        '0xnode1': {
          messageHash: '0xhash1',
          signature: '0xdead',
          signerAddress: '0xsnr1',
        },
      };
      const errors = {
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        signingResults,
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
      // set up 3 signers - it matters based on how mismatched hashes are handled
      vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue([
        { operator: '0xsnr1', provider: '0xnode1', signature: '0xa' },
        { operator: '0xsnr2', provider: '0xnode2', signature: '0xb' },
        { operator: '0xsnr3', provider: '0xnode3', signature: '0xc' },
      ]);

      const signingResults = {
        '0xnode1': {
          messageHash: '0xhash1',
          signature: '0xdead',
          signerAddress: '0xsnr1',
        },
        '0xnode2': {
          messageHash: '0xhash2',
          signature: '0xbeef',
          signerAddress: '0xsnr2',
        },
        '0xnode3': {
          messageHash: '0xhash3',
          signature: '0xcafe',
          signerAddress: '0xsnr3',
        },
      };
      const errors = {};

      porterSignUserOpMock.mockResolvedValue({
        signingResults,
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

      const signingResults = {
        '0xnode1': {
          messageHash: '0xhash1',
          signature: '0xdead',
          signerAddress: '0xsnr1',
        },
      };
      const errors = {
        '0xnode2': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        signingResults,
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
        messageHash: '0xhash1',
        aggregatedSignature: '0xdead',
        signingResults,
      });
    });

    it('ignore errors/mismatched hashes if threshold of matching hashes and signatures from Porter', async () => {
      const signingResults = {
        '0xnode1': {
          messageHash: '0xhash1',
          signature: '0xdead',
          signerAddress: '0xsnr1',
        },
        '0xnode2': {
          messageHash: '0xhash2',
          signature: '0xcafe',
          signerAddress: '0xsnr2',
        },
        '0xnode3': {
          messageHash: '0xhash3',
          signature: '0xbabe',
          signerAddress: '0xsnr3',
        },
        '0xnode4': {
          messageHash: '0xhash1',
          signature: '0xbeef',
          signerAddress: '0xsnr4',
        },
      };
      const errors = {
        '0x7890': 'Failed to sign',
      };

      porterSignUserOpMock.mockResolvedValue({
        signingResults,
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
        messageHash: '0xhash1',
        aggregatedSignature: '0xdeadbeef',
        signingResults,
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
