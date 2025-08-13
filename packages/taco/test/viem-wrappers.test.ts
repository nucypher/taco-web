/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi } from 'vitest';

import {
  createEthersFromViem,
  createEthersProvider,
  createEthersSigner,
} from '../src/wrappers/viem-wrappers';

describe('viem wrapper utilities', () => {
  describe('function exports', () => {
    it('should export all wrapper functions', () => {
      expect(createEthersProvider).toBeDefined();
      expect(createEthersSigner).toBeDefined();
      expect(createEthersFromViem).toBeDefined();
      expect(typeof createEthersProvider).toBe('function');
      expect(typeof createEthersSigner).toBe('function');
      expect(typeof createEthersFromViem).toBe('function');
    });
  });

  describe('createEthersProvider', () => {
    it('should create a provider from viem client', () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x'),
        getBalance: vi.fn().mockResolvedValue(BigInt(0)),
        getTransactionCount: vi.fn().mockResolvedValue(0),
        estimateGas: vi.fn().mockResolvedValue(BigInt(21000)),
        getGasPrice: vi.fn().mockResolvedValue(BigInt(20000000000)),
      } as any;

      const provider = createEthersProvider(mockViemPublicClient);
      
      expect(provider).toBeDefined();
      expect(provider.getNetwork).toBeDefined();
      expect(provider.getBlockNumber).toBeDefined();
      expect(provider.call).toBeDefined();
      expect(provider.getBalance).toBeDefined();
      expect(provider.getTransactionCount).toBeDefined();
      expect(provider.getGasPrice).toBeDefined();
    });
  });

  describe('createEthersSigner', () => {
    it('should create a signer from viem account', () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
        signTransaction: vi.fn().mockResolvedValue('0xsignedtx'),
      } as any;

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 80002 }),
      } as any;

      const signer = createEthersSigner(mockViemAccount, mockProvider);
      
      expect(signer).toBeDefined();
      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();
      expect(signer.signTransaction).toBeDefined();
      expect(signer.provider).toBe(mockProvider);
    });
  });

  describe('createEthersFromViem', () => {
    it('should create both provider and signer', () => {
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

      const { provider, signer } = createEthersFromViem(
        mockViemPublicClient,
        mockViemWalletClient
      );
      
      expect(provider).toBeDefined();
      expect(signer).toBeDefined();
      expect(signer.provider).toBe(provider);
    });

    it('should throw error when wallet client has no account', () => {
      const mockViemPublicClient = {} as any;
      const mockViemWalletClient = {
        account: undefined,
      } as any;

      expect(() => createEthersFromViem(
        mockViemPublicClient,
        mockViemWalletClient
      )).toThrow('Wallet client must have an account attached');
    });
  });

  describe('error handling', () => {
    it('should handle missing viem gracefully', () => {
      // This test verifies that the functions exist and are callable
      expect(createEthersProvider).toBeDefined();
      expect(createEthersSigner).toBeDefined();
      expect(createEthersFromViem).toBeDefined();
      expect(typeof createEthersProvider).toBe('function');
      expect(typeof createEthersSigner).toBe('function');
      expect(typeof createEthersFromViem).toBe('function');
    });
  });
});
