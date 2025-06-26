import { convertUserOperationToPython, PorterClient, SigningCoordinatorAgent } from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signUserOp } from '../src/sign';

describe('TACo Signing', () => {
  let signUserOpMock: ReturnType<typeof vi.fn>;
  let mockProvider: ethers.providers.Provider;

  beforeEach(() => {
    signUserOpMock = vi.fn();
    mockProvider = {} as ethers.providers.Provider;
    
    vi.spyOn(PorterClient.prototype, 'signUserOp').mockImplementation(signUserOpMock);
    vi.spyOn(SigningCoordinatorAgent, 'getParticipants').mockResolvedValue([
      { operator: '0x1234', provider: '0x5678', signature: '0x90ab' },
      { operator: '0xabcd', provider: '0xefgh', signature: '0xijkl' }
    ]);
    vi.spyOn(SigningCoordinatorAgent, 'getThreshold').mockResolvedValue(2);
  });

  describe('signUserOp', () => {
    const userOp = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: '0x1',
      factory: '0x0000000000000000000000000000000000000000',
      factoryData: '0x',
      callData: '0xabc',
      callGasLimit: '0x20000',
      verificationGasLimit: '0x15000',
      preVerificationGas: '0x1000',
      maxFeePerGas: '0xabc',
      maxPriorityFeePerGas: '0x123',
      paymaster: '0x0000000000000000000000000000000000000000',
      paymasterVerificationGasLimit: '0x0',
      paymasterPostOpGasLimit: '0x0',
      paymasterData: '0x',
      signature: '0x',
    };

    it('should sign a user operation with a 0.8.0 account', async () => {
      const chainId = 1;
      const aaVersion = '0.8.0';
      const cohortId = 5;
      const porterUris = [fakePorterUri];

      signUserOpMock.mockResolvedValue({
        messageHash: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        errors: {},
      });

      const result = await signUserOp(
        mockProvider,
        'lynx',
        cohortId,
        chainId,
        userOp,
        aaVersion,
        { optimistic: true, returnAggregated: true },
        undefined,
        porterUris
      );

      const pythonUserOp = convertUserOperationToPython(userOp);

      expect(signUserOpMock).toHaveBeenCalledWith(
        {
          '0x5678': btoa(JSON.stringify({
            user_op: JSON.stringify(pythonUserOp),
            aa_version: aaVersion,
            cohort_id: cohortId,
            chain_id: chainId,
            context: {},
            signature_type: "userop"
          })),
          '0xefgh': btoa(JSON.stringify({
            user_op: JSON.stringify(pythonUserOp),
            aa_version: aaVersion,
            cohort_id: cohortId,
            chain_id: chainId,
            context: {},
            signature_type: "userop"
          }))
        },
        2,
        { optimistic: true, returnAggregated: true }
      );

      expect(result).toEqual({
        messageHash: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        errors: {},
      });
    });

    it('should handle custom signing options', async () => {
      const chainId = 1;
      const aaVersion = '0.8.0';
      const cohortId = 5;
      const porterUris = [fakePorterUri];
      const options = { optimistic: false, returnAggregated: false };

      signUserOpMock.mockResolvedValue({
        messageHash: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        errors: {},
      });

      await signUserOp(
        mockProvider,
        'lynx',
        cohortId,
        chainId,
        userOp,
        aaVersion,
        options,
        undefined,
        porterUris
      );

      const pythonUserOp2 = convertUserOperationToPython(userOp);

      expect(signUserOpMock).toHaveBeenCalledWith(
        {
          '0x5678': btoa(JSON.stringify({
            user_op: JSON.stringify(pythonUserOp2),
            aa_version: aaVersion,
            cohort_id: cohortId,
            chain_id: chainId,
            context: {},
            signature_type: "userop"
          })),
          '0xefgh': btoa(JSON.stringify({
            user_op: JSON.stringify(pythonUserOp2),
            aa_version: aaVersion,
            cohort_id: cohortId,
            chain_id: chainId,
            context: {},
            signature_type: "userop"
          }))
        },
        2,
        options
      );
    });
  });
});
