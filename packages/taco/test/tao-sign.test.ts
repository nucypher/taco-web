import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PorterClient } from '@nucypher/shared';
import { fakePorterUri } from '@nucypher/test-utils';

import { sign191, signUserOp } from '../src/sign';
import { UserOperation } from '../src/types';

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
    const message = 'Hello, TACo!';
    const cohortId = 5;
    const domain = fakePorterUri;

    it('should sign a string message', async () => {
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      sign191Mock.mockResolvedValue(expectedResult);

      const result = await sign191(message, cohortId, domain);

      expect(sign191Mock).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        cohortId,
        true,
        true
      );
      expect(result).toEqual({
        digest: expectedResult.digest,
        aggregatedSignature: expectedResult.aggregated_signature,
        signingResults: expectedResult.signing_results,
        type: expectedResult.type,
      });
    });

    it('should sign a Uint8Array message', async () => {
      const messageBytes = new TextEncoder().encode(message);
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      sign191Mock.mockResolvedValue(expectedResult);

      const result = await sign191(messageBytes, cohortId, domain);

      expect(sign191Mock).toHaveBeenCalledWith(
        messageBytes,
        cohortId,
        true,
        true
      );
      expect(result).toEqual({
        digest: expectedResult.digest,
        aggregatedSignature: expectedResult.aggregated_signature,
        signingResults: expectedResult.signing_results,
        type: expectedResult.type,
      });
    });

    it('should handle custom signing options', async () => {
      const options = { optimistic: false, returnAggregated: false };
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      sign191Mock.mockResolvedValue(expectedResult);

      await sign191(message, cohortId, domain, options);

      expect(sign191Mock).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        cohortId,
        false,
        false
      );
    });
  });

  describe('signUserOp', () => {
    const userOp: UserOperation = {
      sender: '0x123',
      nonce: '0x1',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x1',
      verificationGasLimit: '0x1',
      preVerificationGas: '0x1',
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
      paymasterAndData: '0x',
      signature: '0x',
    };
    const chainId = 1;
    const cohortId = 5;
    const domain = fakePorterUri;

    it('should sign a user operation with zerodev account', async () => {
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      signUserOpMock.mockResolvedValue(expectedResult);

      const result = await signUserOp(
        userOp,
        chainId,
        'zerodev',
        'v0.6',
        cohortId,
        domain
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        'zerodev',
        'v0.6',
        cohortId,
        true,
        true
      );
      expect(result).toEqual({
        digest: expectedResult.digest,
        aggregatedSignature: expectedResult.aggregated_signature,
        signingResults: expectedResult.signing_results,
        type: expectedResult.type,
      });
    });

    it('should sign a user operation with kernel account', async () => {
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      signUserOpMock.mockResolvedValue(expectedResult);

      const result = await signUserOp(
        userOp,
        chainId,
        'kernel',
        'v0.7',
        cohortId,
        domain
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        'kernel',
        'v0.7',
        cohortId,
        true,
        true
      );
      expect(result).toEqual({
        digest: expectedResult.digest,
        aggregatedSignature: expectedResult.aggregated_signature,
        signingResults: expectedResult.signing_results,
        type: expectedResult.type,
      });
    });

    it('should handle custom signing options', async () => {
      const options = { optimistic: false, returnAggregated: false };
      const expectedResult = {
        digest: '0x123',
        aggregated_signature: '0x456',
        signing_results: {
          '0x789': ['0xabc', '0xdef'],
        },
        type: 'eip191',
      };

      signUserOpMock.mockResolvedValue(expectedResult);

      await signUserOp(
        userOp,
        chainId,
        'safe',
        'v0.8',
        cohortId,
        domain,
        options
      );

      expect(signUserOpMock).toHaveBeenCalledWith(
        userOp,
        chainId,
        'safe',
        'v0.8',
        cohortId,
        false,
        false
      );
    });
  });
});
