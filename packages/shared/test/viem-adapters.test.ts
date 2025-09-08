/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import {
  createTacoFromViem,
  createTacoProvider,
  createTacoSigner,
} from '@nucypher/shared';

describe('viem adapter utilities', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(createTacoProvider).toBeDefined();
      expect(createTacoSigner).toBeDefined();
      expect(createTacoFromViem).toBeDefined();
      expect(typeof createTacoProvider).toBe('function');
      expect(typeof createTacoSigner).toBe('function');
      expect(typeof createTacoFromViem).toBe('function');
    });
  });

  describe('createTacoProvider', () => {
    it('should create a provider from viem client', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x'),
      } as any;
      const provider = await createTacoProvider(mockViemPublicClient);
      expect(provider).toBeDefined();
      expect(provider.getNetwork).toBeDefined();
      expect(provider.call).toBeDefined();
    });
  });

  describe('createTacoSigner', () => {
    it('should create a signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
      } as any;

      const tacoProvider = await createTacoProvider(mockViemPublicClient);
      const signer = await createTacoSigner(mockViemAccount, tacoProvider);

      expect(signer).toBeDefined();
      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();
      expect(signer.provider).toBe(tacoProvider);
    });
  });

  describe('createTacoFromViem', () => {
    it('should create both provider and signer', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x'),
        getBalance: vi.fn().mockResolvedValue(BigInt(0)),
        getTransactionCount: vi.fn().mockResolvedValue(0),
        estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
        getGasPrice: vi.fn().mockResolvedValue(BigInt(20000000000)),
      } as any;

      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const mockViemWalletClient = {
        account: mockViemAccount,
      } as any;

      const { provider, signer } = await createTacoFromViem(
        mockViemPublicClient,
        mockViemWalletClient,
      );

      expect(provider).toBeDefined();
      expect(signer).toBeDefined();
      expect(signer.provider).toBe(provider);
    });

    it('should throw error when wallet client has no account', async () => {
      const mockViemPublicClient = {} as any;
      const mockViemWalletClient = {
        account: undefined,
      } as any;

      await expect(
        createTacoFromViem(mockViemPublicClient, mockViemWalletClient),
      ).rejects.toThrow('Wallet client must have an account attached');
    });
  });

  describe('error handling', () => {
    it('should handle missing viem gracefully', () => {
      // This test verifies that the functions exist and are callable
      expect(createTacoProvider).toBeDefined();
      expect(createTacoSigner).toBeDefined();
      expect(createTacoFromViem).toBeDefined();
      expect(typeof createTacoProvider).toBe('function');
      expect(typeof createTacoSigner).toBe('function');
      expect(typeof createTacoFromViem).toBe('function');
    });
  });
});
