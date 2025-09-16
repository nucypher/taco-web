/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toEthersProvider, toTACoSigner } from '../src/adapters';
import { ViemSignerAdapter } from '../src/viem/signer-adapter';
import { isViemAccount, isViemClient } from '../src/viem/type-guards';

describe('viem adapter utilities', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(toEthersProvider).toBeDefined();
      expect(toTACoSigner).toBeDefined();
      expect(isViemClient).toBeDefined();
      expect(isViemAccount).toBeDefined();
      expect(typeof toEthersProvider).toBe('function');
      expect(typeof toTACoSigner).toBe('function');
      expect(typeof isViemClient).toBe('function');
      expect(typeof isViemAccount).toBe('function');
    });
  });

  describe('ethers provider interop', () => {
    let mockViemPublicClient: any;

    beforeEach(() => {
      mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x1234'),
        chain: {
          name: 'Polygon Amoy',
          id: 80002,
          contracts: {},
        },
        transport: {
          type: 'http',
          url: 'https://rpc.ankr.com/polygon_amoy',
        },
      };
    });

    it('should create an ethers provider from viem client (http)', () => {
      const provider = toEthersProvider(mockViemPublicClient);

      expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });
  });

  describe('ViemSignerAdapter', () => {
    let mockViemAccount: any;

    beforeEach(() => {
      mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      };
    });

    it('should create signer without provider', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);

      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();

      // Actually call the methods to ensure coverage
      await signer.getAddress();
      await signer.signMessage('test');
    });

    it('should get address from viem account', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);
      const address = await signer.getAddress();

      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should sign string message', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);
      const signature = await signer.signMessage('test message');

      expect(signature).toBe('0xsignature');
      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: 'test message',
      });
    });

    it('should sign Uint8Array message', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);
      const message = new Uint8Array([1, 2, 3, 4]);

      await signer.signMessage(message);

      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: {
          raw: message,
        },
      });
    });

    it('should throw error if account does not support signing', async () => {
      const accountWithoutSigning = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        // no signMessage method
      };

      const signer = new ViemSignerAdapter(accountWithoutSigning);

      await expect(signer.signMessage('test')).rejects.toThrow(
        'Account does not support message signing',
      );
    });
  });

  describe('toEthersProvider', () => {
    it('should create provider from viem client', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
        chain: { name: 'test', id: 80002 },
        transport: { type: 'http', url: 'https://rpc.ankr.com/polygon_amoy' },
      } as any;

      const provider = toEthersProvider(mockViemPublicClient);

      expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });

    it('should return ethers provider unchanged', () => {
      const ethersProvider = new ethers.providers.JsonRpcProvider();
      const result = toEthersProvider(ethersProvider);

      expect(result).toBe(ethersProvider);
    });

    it('should handle non-viem provider correctly', () => {
      const nonViemProvider = {
        someProperty: 'value',
        someMethod: () => {},
      } as any;

      const result = toEthersProvider(nonViemProvider);

      expect(result).toBe(nonViemProvider);
    });
  });

  describe('toTACoSigner', () => {
    it('should create signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const signer = toTACoSigner(mockViemAccount);

      expect(signer).toBeInstanceOf(ViemSignerAdapter);

      // Actually call methods to ensure coverage
      const address = await signer.getAddress();
      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should return ethers signer unchanged', () => {
      const ethersSigner = new ethers.Wallet('0x' + '1'.repeat(64));
      const result = toTACoSigner(ethersSigner);

      expect(result).toBe(ethersSigner);
    });

    it('should handle non-viem signer correctly', () => {
      const nonViemSigner = {
        someProperty: 'value',
        someMethod: () => {},
        provider: {}, // This will make it fail the isViemAccount check
      } as any;

      const result = toTACoSigner(nonViemSigner);

      expect(result).toBe(nonViemSigner);
    });
  });

  describe('type guards', () => {
    describe('isViemClient', () => {
      it('should identify viem client by chain property', () => {
        const viemClient = {
          chain: { name: 'test', id: 1 },
          getChainId: vi.fn(),
        };

        expect(isViemClient(viemClient)).toBe(true);
      });

      it('should identify viem client by getChainId method', () => {
        const viemClient = {
          getChainId: () => Promise.resolve(1),
        };

        expect(isViemClient(viemClient)).toBe(true);
      });

      it('should reject ethers provider', () => {
        const ethersProvider = new ethers.providers.JsonRpcProvider();

        expect(isViemClient(ethersProvider)).toBe(false);
      });

      it('should reject object without viem properties', () => {
        const notViemClient = {
          someMethod: () => {},
        };

        expect(isViemClient(notViemClient)).toBe(false);
      });
    });

    describe('isViemAccount', () => {
      it('should identify viem account by address property', () => {
        const viemAccount = {
          address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        };

        expect(isViemAccount(viemAccount)).toBe(true);
      });

      it('should reject ethers signer', () => {
        const ethersSigner = new ethers.Wallet('0x' + '1'.repeat(64));

        expect(isViemAccount(ethersSigner)).toBe(false);
      });

      it('should reject object with provider property', () => {
        const signerWithProvider = {
          address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
          provider: {},
        };

        expect(isViemAccount(signerWithProvider)).toBe(false);
      });
    });
  });
});
