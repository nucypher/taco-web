import {
  convertUserOperationToPython,
  PorterClient,
  SigningCoordinatorAgent,
} from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signUserOp } from '../src/sign';

describe('TACo Signing', () => {
  let porterSignUserOpMock: ReturnType<typeof vi.fn>;
  let mockProvider: ethers.providers.Provider;

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

  describe('signUserOp', () => {
    const userOp = {
      sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
      nonce: 1,
      factory: '0x0000000000000000000000000000000000000000',
      factoryData: '0x',
      callData: '0xabc',
      callGasLimit: 131072,
      verificationGasLimit: 86016,
      preVerificationGas: 4096,
      maxFeePerGas: 2748,
      maxPriorityFeePerGas: 291,
      paymaster: '0x0000000000000000000000000000000000000000',
      paymasterVerificationGasLimit: 0,
      paymasterPostOpGasLimit: 0,
      paymasterData: '0x',
      signature: '0x',
    };
    const chainId = 1;
    const cohortId = 5;
    const porterUris = [fakePorterUri];
    const aaVersion = '0.8.0';
    const threshold = 2;

    it.each(['0.8.0', 'mdt'])(
      'should sign a user operation with a valid aa versions',
      async (validAAVersion) => {
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

        const pythonUserOp = convertUserOperationToPython(userOp);

        expect(porterSignUserOpMock).toHaveBeenCalledWith(
          {
            '0xnode1': btoa(
              JSON.stringify({
                user_op: JSON.stringify(pythonUserOp),
                aa_version: validAAVersion,
                cohort_id: cohortId,
                chain_id: chainId,
                context: {},
                signature_type: 'userop',
              }),
            ),
            '0xnode2': btoa(
              JSON.stringify({
                user_op: JSON.stringify(pythonUserOp),
                aa_version: validAAVersion,
                cohort_id: cohortId,
                chain_id: chainId,
                context: {},
                signature_type: 'userop',
              }),
            ),
          },
          threshold,
        );

        expect(result).toEqual({
          messageHash: '0xhash1',
          aggregatedSignature: '0xdeadbeef',
          signingResults,
          errors,
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

      const pythonUserOp = convertUserOperationToPython(userOp);
      expect(porterSignUserOpMock).toHaveBeenCalledWith(
        {
          '0xnode1': btoa(
            JSON.stringify({
              user_op: JSON.stringify(pythonUserOp),
              aa_version: aaVersion,
              cohort_id: cohortId,
              chain_id: chainId,
              context: {},
              signature_type: 'userop',
            }),
          ),
          '0xnode2': btoa(
            JSON.stringify({
              user_op: JSON.stringify(pythonUserOp),
              aa_version: aaVersion,
              cohort_id: cohortId,
              chain_id: chainId,
              context: {},
              signature_type: 'userop',
            }),
          ),
        },
        threshold,
      );
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
        errors,
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
        errors,
      });
    });
  });
});
