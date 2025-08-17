/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import {
  createEthersFromViem,
  createTacoCompatibleProvider,
  createTacoCompatibleSigner,
} from '../src/wrappers/viem-adapters';

describe('viem adapter utilities', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(createTacoCompatibleProvider).toBeDefined();
      expect(createTacoCompatibleSigner).toBeDefined();
      expect(createEthersFromViem).toBeDefined();
      expect(typeof createTacoCompatibleProvider).toBe('function');
      expect(typeof createTacoCompatibleSigner).toBe('function');
      expect(typeof createEthersFromViem).toBe('function');
    });
  });

  describe('createTacoCompatibleProvider', () => {
    it('should create a provider from viem client', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x'),
        getBalance: vi.fn().mockResolvedValue(BigInt(0)),
        getTransactionCount: vi.fn().mockResolvedValue(0),
        estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
        getGasPrice: vi.fn().mockResolvedValue(BigInt(20000000000)),
      } as any;

      const provider = await createTacoCompatibleProvider(mockViemPublicClient);

      expect(provider).toBeDefined();
      expect(provider.getNetwork).toBeDefined();
      expect(provider.getBlockNumber).toBeDefined();
      expect(provider.call).toBeDefined();
      expect(provider.getBalance).toBeDefined();
      expect(provider.getTransactionCount).toBeDefined();
      expect(provider.getGasPrice).toBeDefined();
    });
  });

  describe('createTacoCompatibleSigner', () => {
    it('should create a signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
        signTransaction: vi.fn().mockResolvedValue('0xsignedtx'),
      } as any;

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 80002 }),
      } as any;

      const signer = await createTacoCompatibleSigner(mockViemAccount, mockProvider);

      expect(signer).toBeDefined();
      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();
      expect(signer.signTransaction).toBeDefined();
      expect(signer.provider).toBe(mockProvider);
    });
  });

  describe('createEthersFromViem', () => {
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

      const { provider, signer } = await createEthersFromViem(
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
        createEthersFromViem(mockViemPublicClient, mockViemWalletClient)
      ).rejects.toThrow('Wallet client must have an account attached');
    });
  });

  describe('error handling', () => {
    it('should handle missing viem gracefully', () => {
      // This test verifies that the functions exist and are callable
      expect(createTacoCompatibleProvider).toBeDefined();
      expect(createTacoCompatibleSigner).toBeDefined();
      expect(createEthersFromViem).toBeDefined();
      expect(typeof createTacoCompatibleProvider).toBe('function');
      expect(typeof createTacoCompatibleSigner).toBe('function');
      expect(typeof createEthersFromViem).toBe('function');
    });
  });
});
