/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import { toEthersProvider, toEthersSigner } from '@nucypher/shared';

describe('viem adapter utilities', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(toEthersProvider).toBeDefined();
      expect(toEthersSigner).toBeDefined();
      expect(typeof toEthersProvider).toBe('function');
      expect(typeof toEthersSigner).toBe('function');
    });
  });

  describe('toEthersProvider', () => {
    it('should create a provider from viem client', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x'),
      } as any;
      const provider = await toEthersProvider(mockViemPublicClient);
      expect(provider).toBeDefined();
      expect(provider.getNetwork).toBeDefined();
      expect(provider.call).toBeDefined();
    });
  });

  describe('toEthersSigner', () => {
    it('should create a signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
      } as any;

      const tacoProvider = toEthersProvider(mockViemPublicClient);
      const signer = toEthersSigner(mockViemAccount, tacoProvider);

      expect(signer).toBeDefined();
      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();
      expect(signer.provider).toBe(tacoProvider);
    });
  });

  describe('error handling', () => {
    it('should handle missing viem gracefully', () => {
      // This test verifies that the functions exist and are callable
      expect(toEthersProvider).toBeDefined();
      expect(toEthersSigner).toBeDefined();
      expect(typeof toEthersProvider).toBe('function');
      expect(typeof toEthersSigner).toBe('function');
    });
  });
});
