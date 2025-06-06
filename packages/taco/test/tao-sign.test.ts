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
      const domain = fakePorterUri;

      sign191Mock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });

      const result = await sign191(message, cohortId, domain);

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
      const domain = fakePorterUri;

      sign191Mock.mockResolvedValue({
        digest: '0x1234',
        aggregatedSignature: '0x90ab0xijkl',
        signingResults: {
          '0x1234': ['0x5678', '0x90ab'],
          '0xabcd': ['0xefgh', '0xijkl'],
        },
        type: 'eip191',
      });

      const result = await sign191(messageBytes, cohortId, domain);

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
      const domain = fakePorterUri;
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

      await sign191(message, cohortId, domain, options);

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
      initCode: '0x',
      callData: '0xabc',
      callGasLimit: '0x20000',
      verificationGasLimit: '0x15000',
      preVerificationGas: '0x1000',
      maxFeePerGas: '0xabc',
      maxPriorityFeePerGas: '0x123',
      paymasterAndData: '0x',
      signature: '0x',
    };

    it('should sign a user operation with zerodev account', async () => {
      const chainId = 1;
      const accountSpec = 'zerodev';
      const entryPointVersion = 'v0.6';
      const cohortId = 5;
      const domain = fakePorterUri;

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
        accountSpec,
        entryPointVersion,
        cohortId,
        domain
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        accountSpec,
        entryPointVersion,
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
      const accountSpec = 'kernel';
      const entryPointVersion = 'v0.7';
      const cohortId = 5;
      const domain = fakePorterUri;

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
        accountSpec,
        entryPointVersion,
        cohortId,
        domain
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        accountSpec,
        entryPointVersion,
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
      const accountSpec = 'safe';
      const entryPointVersion = 'v0.8';
      const cohortId = 5;
      const domain = fakePorterUri;
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
        accountSpec,
        entryPointVersion,
        cohortId,
        domain,
        options
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        accountSpec,
        entryPointVersion,
        cohortId,
        options
      );
    });
  });
});
