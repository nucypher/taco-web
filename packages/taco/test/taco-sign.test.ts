import { PorterClient } from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sign191, signUserOp } from '../src/sign';

describe('TACo Signing', () => {
  let sign191Mock: ReturnType<typeof vi.fn>;
  let signUserOpMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sign191Mock = vi.fn();
    signUserOpMock = vi.fn();
    vi.spyOn(PorterClient.prototype, 'sign191').mockImplementation(sign191Mock);
    vi.spyOn(PorterClient.prototype, 'signUserOp').mockImplementation(signUserOpMock);
  });

  describe('sign191', () => {
    it('should sign a string message', async () => {
      const message = 'Hello, TACo!';
      const cohortId = 5;
      const porterUris = [fakePorterUri];

      sign191Mock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });

      const result = await sign191(message, cohortId, 'lynx', undefined, porterUris);

      expect(sign191Mock).toHaveBeenCalledWith(
        expect.any(Uint8Array),
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
        type: 'eip191',
      });
    });

    it('should sign a Uint8Array message', async () => {
      const messageBytes = new TextEncoder().encode('Hello, TACo!');
      const cohortId = 5;
      const porterUris = [fakePorterUri];

      sign191Mock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });

      const result = await sign191(messageBytes, cohortId, 'lynx', undefined, porterUris);

      expect(sign191Mock).toHaveBeenCalledWith(
        messageBytes,
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
        type: 'eip191',
      });
    });

    it('should handle custom signing options', async () => {
      const message = 'Hello, TACo!';
      const cohortId = 5;
      const porterUris = [fakePorterUri];
      const options = { optimistic: false, returnAggregated: false };

      sign191Mock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });

      await sign191(message, cohortId, 'lynx', options, porterUris);

      expect(sign191Mock).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        cohortId,
        options
      );
    });
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
