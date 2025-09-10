/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  toEthersProvider,
  toEthersSigner,
  ViemTacoProvider,
  ViemTacoSigner,
} from '../src/viem/ethers-viem-utils';
import { isViemAccount, isViemClient } from '../src/viem/type-guards';

describe('viem adapter utilities', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(toEthersProvider).toBeDefined();
      expect(toEthersSigner).toBeDefined();
      expect(ViemTacoProvider).toBeDefined();
      expect(ViemTacoSigner).toBeDefined();
      expect(isViemClient).toBeDefined();
      expect(isViemAccount).toBeDefined();
      expect(typeof toEthersProvider).toBe('function');
      expect(typeof toEthersSigner).toBe('function');
      expect(typeof isViemClient).toBe('function');
      expect(typeof isViemAccount).toBe('function');
    });
  });

  describe('ViemTacoProvider', () => {
    let mockViemPublicClient: any;

    beforeEach(() => {
      mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        call: vi.fn().mockResolvedValue('0x1234'),
        chain: {
          name: 'Polygon Amoy',
          id: 80002,
        },
      };
    });

    it('should create provider with ethers compatibility properties', async () => {
      const provider = new ViemTacoProvider(mockViemPublicClient);

      expect(provider._isProvider).toBe(true);
      expect(provider._network).toBeDefined();
      expect(provider.getNetwork).toBeDefined();
      expect(provider.call).toBeDefined();

      // Actually call the methods to ensure coverage
      await provider.getNetwork();
      await provider.call({ to: '0x123', data: '0xabc' });
    });

    it('should get network information correctly', async () => {
      const provider = new ViemTacoProvider(mockViemPublicClient);
      const network = await provider.getNetwork();

      expect(network.chainId).toBe(80002);
      expect(network.name).toBe('Polygon Amoy');
      expect(mockViemPublicClient.getChainId).toHaveBeenCalled();
    });

    it('should handle missing chain name', async () => {
      const clientWithoutChain = {
        ...mockViemPublicClient,
        chain: undefined,
      };

      const provider = new ViemTacoProvider(clientWithoutChain);
      const network = await provider.getNetwork();

      expect(network.chainId).toBe(80002);
      expect(network.name).toBe('chain-80002');
    });

    it('should handle call with transaction data', async () => {
      const provider = new ViemTacoProvider(mockViemPublicClient);
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xabcdef',
        value: ethers.BigNumber.from('1000'),
      };

      const result = await provider.call(transaction);

      expect(result).toBe('0x1234');
      expect(mockViemPublicClient.call).toHaveBeenCalledWith({
        to: transaction.to,
        data: transaction.data,
        value: BigInt('1000'),
      });
    });

    it('should handle call without value', async () => {
      const provider = new ViemTacoProvider(mockViemPublicClient);
      const transaction = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0xabcdef',
      };

      await provider.call(transaction);

      expect(mockViemPublicClient.call).toHaveBeenCalledWith({
        to: transaction.to,
        data: transaction.data,
        value: undefined,
      });
    });

    it('should handle call result with data property', async () => {
      mockViemPublicClient.call.mockResolvedValue({ data: '0x5678' });

      const provider = new ViemTacoProvider(mockViemPublicClient);
      const result = await provider.call({ to: '0x123', data: '0xabc' });

      expect(result).toBe('0x5678');
    });
  });

  describe('ViemTacoSigner', () => {
    let mockViemAccount: any;
    let mockProvider: any;

    beforeEach(() => {
      mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      };

      mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 80002, name: 'test' }),
      };
    });

    it('should create signer without provider', async () => {
      const signer = new ViemTacoSigner(mockViemAccount);

      expect(signer.provider).toBeUndefined();
      expect(signer.getAddress).toBeDefined();
      expect(signer.signMessage).toBeDefined();

      // Actually call the methods to ensure coverage
      await signer.getAddress();
      await signer.signMessage('test');
    });

    it('should create signer with provider', async () => {
      const signer = new ViemTacoSigner(mockViemAccount, mockProvider);

      expect(signer.provider).toBe(mockProvider);
    });

    it('should get address from viem account', async () => {
      const signer = new ViemTacoSigner(mockViemAccount);
      const address = await signer.getAddress();

      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should sign string message', async () => {
      const signer = new ViemTacoSigner(mockViemAccount);
      const signature = await signer.signMessage('test message');

      expect(signature).toBe('0xsignature');
      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: 'test message',
      });
    });

    it('should sign Uint8Array message', async () => {
      const signer = new ViemTacoSigner(mockViemAccount);
      const message = new Uint8Array([1, 2, 3, 4]);

      await signer.signMessage(message);

      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: '0x01020304',
      });
    });

    it('should throw error if account does not support signing', async () => {
      const accountWithoutSigning = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        // no signMessage method
      };

      const signer = new ViemTacoSigner(accountWithoutSigning);

      await expect(signer.signMessage('test')).rejects.toThrow(
        'Account does not support message signing',
      );
    });

    it('should connect to provider', () => {
      const signer = new ViemTacoSigner(mockViemAccount);
      const connected = signer.connect(mockProvider);

      expect(signer.provider).toBe(mockProvider);
      expect(connected).toBe(signer);
    });
  });

  describe('toEthersProvider', () => {
    it('should create provider from viem client', async () => {
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
        chain: { name: 'test', id: 80002 },
      } as any;

      const provider = toEthersProvider(mockViemPublicClient);

      expect(provider).toBeInstanceOf(ViemTacoProvider);
      expect(provider.getNetwork).toBeDefined();
      expect(provider.call).toBeDefined();

      // Actually call the methods to ensure coverage
      const network = await provider.getNetwork();
      expect(network.chainId).toBe(80002);
      expect(network.name).toBe('test');
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

  describe('toEthersSigner', () => {
    it('should create signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const mockProvider = {
        getNetwork: vi.fn().mockResolvedValue({ chainId: 80002, name: 'test' }),
      } as any;

      const signer = toEthersSigner(mockViemAccount, mockProvider);

      expect(signer).toBeInstanceOf(ViemTacoSigner);
      expect(signer.provider).toBe(mockProvider);

      // Actually call methods to ensure coverage
      const address = await signer.getAddress();
      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should create signer without provider', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsig'),
      } as any;

      const signer = toEthersSigner(mockViemAccount);

      expect(signer).toBeInstanceOf(ViemTacoSigner);
      expect(signer.provider).toBeUndefined();

      // Actually call methods to ensure coverage
      const address = await signer.getAddress();
      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should return ethers signer unchanged', () => {
      const ethersSigner = new ethers.Wallet('0x' + '1'.repeat(64));
      const result = toEthersSigner(ethersSigner);

      expect(result).toBe(ethersSigner);
    });

    it('should handle non-viem signer correctly', () => {
      const nonViemSigner = {
        someProperty: 'value',
        someMethod: () => {},
        provider: {}, // This will make it fail the isViemAccount check
      } as any;

      const result = toEthersSigner(nonViemSigner);

      expect(result).toBe(nonViemSigner);
    });

    it('should create signer with provider adapter', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const mockViemClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
        chain: { name: 'test', id: 80002 },
      } as any;

      const result = toEthersSigner(mockViemAccount, mockViemClient);

      expect(result).toBeInstanceOf(ViemTacoSigner);
      expect(result.provider).toBeDefined();

      // Actually call methods to test the provider adapter
      const address = await result.getAddress();
      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');

      // Test the provider was properly adapted
      const network = await result.provider.getNetwork();
      expect(network.chainId).toBe(80002);
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
