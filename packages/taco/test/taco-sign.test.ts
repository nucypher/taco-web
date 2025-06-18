import { PorterClient } from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signUserOp } from '../src/sign';

describe('TACo Signing', () => {
  let signUserOpMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signUserOpMock = vi.fn();
    vi.spyOn(PorterClient.prototype, 'signUserOp').mockImplementation(signUserOpMock);
  });

  describe('signUserOp', () => {
    const userOp = {
      sender: '0x123',
      nonce: '0x1',
      factory: '0x0',
      factoryData: '0x',
      callData: '0xabc',
      callGasLimit: '0x20000',
      verificationGasLimit: '0x15000',
      preVerificationGas: '0x1000',
      maxFeePerGas: '0xabc',
      maxPriorityFeePerGas: '0x123',
      paymaster: '0x0',
      paymasterVerificationGasLimit: '0x0',
      paymasterPostOpGasLimit: '0x0',
      paymasterData: '0x',
      signature: '0x',
    };

    it('should sign a user operation with zerodev account', async () => {
      const chainId = 1;
      const aaVersion = 'zerodev:v0.6';
      const cohortId = 5;
      const porterUris = [fakePorterUri];

      signUserOpMock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'userOp:zerodev',
      });

      const result = await signUserOp(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        'lynx',
        undefined,
        porterUris
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        { optimistic: true, returnAggregated: true }
      );

      expect(result).toEqual({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'userOp:zerodev',
      });
    });

    it('should sign a user operation with kernel account', async () => {
      const chainId = 1;
      const aaVersion = 'kernel:v0.7';
      const cohortId = 5;
      const porterUris = [fakePorterUri];

      signUserOpMock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'userOp:kernel',
      });

      const result = await signUserOp(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        'lynx',
        undefined,
        porterUris
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        { optimistic: true, returnAggregated: true }
      );

      expect(result).toEqual({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'userOp:kernel',
      });
    });

    it('should handle custom signing options', async () => {
      const chainId = 1;
      const aaVersion = 'safe:v0.8';
      const cohortId = 5;
      const porterUris = [fakePorterUri];
      const options = { optimistic: false, returnAggregated: false };

      signUserOpMock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'userOp:safe',
      });

      await signUserOp(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        'lynx',
        options,
        porterUris
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        aaVersion,
        cohortId,
        options
      );
    });
  });
});
