/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  toEthersProvider,
  ViemEthersProviderAdapter,
} from '../src/viem/ethers-adapter';
import { toTacoSigner, ViemSignerAdapter } from '../src/viem/signer-adapter';
import { isViemAccount, isViemClient } from '../src/viem/type-guards';

describe('viem ethers adapter', () => {
  describe('function exports', () => {
    it('should export all adapter functions', () => {
      expect(toEthersProvider).toBeDefined();
      expect(toTacoSigner).toBeDefined();
      expect(ViemEthersProviderAdapter).toBeDefined();
      expect(ViemSignerAdapter).toBeDefined();
      expect(isViemClient).toBeDefined();
      expect(isViemAccount).toBeDefined();
      expect(typeof toEthersProvider).toBe('function');
      expect(typeof toTacoSigner).toBe('function');
      expect(typeof isViemClient).toBe('function');
      expect(typeof isViemAccount).toBe('function');
    });
  });

  describe('ViemEthersProviderAdapter', () => {
    let mockViemPublicClient: any;

    beforeEach(() => {
      mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
        chain: {
          id: 80002,
          name: 'Polygon Amoy',
          contracts: {
            ensRegistry: { address: '0x123' },
          },
        },
        transport: {
          type: 'http',
          url: 'https://rpc.ankr.com/polygon_amoy',
        },
      };
    });

    it('should create adapter from viem client', () => {
      const adapter = new ViemEthersProviderAdapter(mockViemPublicClient);

      expect(adapter).toBeInstanceOf(ViemEthersProviderAdapter);
      expect(adapter.getViemClient()).toBe(mockViemPublicClient);
    });

    it('should create adapter using static factory method', () => {
      const adapter = ViemEthersProviderAdapter.from(mockViemPublicClient);

      expect(adapter).toBeInstanceOf(ViemEthersProviderAdapter);
      expect(adapter.getViemClient()).toBe(mockViemPublicClient);
    });

    it('should convert to ethers provider with single transport', () => {
      const adapter = new ViemEthersProviderAdapter(mockViemPublicClient);
      const provider = adapter.toEthersProvider();

      expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });

    it('should throw error when converting to ethers provider with fallback transport', () => {
      const mockFallbackClient = {
        ...mockViemPublicClient,
        transport: {
          type: 'fallback',
          transports: [
            { value: { url: 'https://rpc1.example.com' } },
            { value: { url: 'https://rpc2.example.com' } },
          ],
        },
      };

      const adapter = new ViemEthersProviderAdapter(mockFallbackClient);
      expect(() => adapter.toEthersProvider()).toThrow(
        'Fallback transport not supported',
      );
    });

    it('should throw error when converting to ethers provider with webSocket transport', () => {
      const mockWebSocketClient = {
        ...mockViemPublicClient,
        transport: {
          type: 'webSocket',
          url: 'wss://example.com',
        },
      };

      const adapter = new ViemEthersProviderAdapter(mockWebSocketClient);
      expect(() => adapter.toEthersProvider()).toThrow(
        'WebSocket transport not supported',
      );
    });

    it('should convert to ethers provider with custom transport (browser injected)', () => {
      const mockEIP1193Provider = {
        request: vi.fn(),
      };

      const mockCustomClient = {
        ...mockViemPublicClient,
        transport: {
          type: 'custom',
          value: {
            provider: mockEIP1193Provider,
          },
        },
      };

      const adapter = new ViemEthersProviderAdapter(mockCustomClient);
      const provider = adapter.toEthersProvider();
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('Web3Provider');
    });

    it('should throw error for custom transport without provider or URL', () => {
      const mockCustomClient = {
        ...mockViemPublicClient,
        transport: {
          type: 'custom',
          value: {},
        },
      };

      const adapter = new ViemEthersProviderAdapter(mockCustomClient);
      expect(() => adapter.toEthersProvider()).toThrow(
        'Custom non-EIP-1193 provider transport not supported',
      );
    });

    it('should handle missing chain', () => {
      const clientWithoutChain = {
        ...mockViemPublicClient,
        chain: undefined,
      };

      const adapter = new ViemEthersProviderAdapter(clientWithoutChain);

      expect(() => adapter.toEthersProvider()).toThrow(
        'Client must have a chain configured',
      );
    });

    it('should handle missing transport URL', () => {
      const clientWithoutUrl = {
        ...mockViemPublicClient,
        transport: {
          type: 'http',
          // missing url
        },
      };

      const adapter = new ViemEthersProviderAdapter(clientWithoutUrl);

      expect(() => adapter.toEthersProvider()).toThrow(
        'Transport must have a URL',
      );
    });

    it('should use static clientToProvider method', () => {
      const provider =
        ViemEthersProviderAdapter.clientToProvider(mockViemPublicClient);

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

    it('should create signer without provider', () => {
      const signer = new ViemSignerAdapter(mockViemAccount);

      expect(signer).toBeInstanceOf(ViemSignerAdapter);
    });

    it('should get address from viem account', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);

      const address = await signer.getAddress();

      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should sign string message', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);

      const signature = await signer.signMessage('test message');

      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: 'test message',
      });
      expect(signature).toBe('0xsignature');
    });

    it('should sign Uint8Array message', async () => {
      const signer = new ViemSignerAdapter(mockViemAccount);
      const messageBytes = new Uint8Array([1, 2, 3]);

      const signature = await signer.signMessage(messageBytes);

      expect(mockViemAccount.signMessage).toHaveBeenCalledWith({
        message: ethers.utils.hexlify(messageBytes),
      });
      expect(signature).toBe('0xsignature');
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
        chain: { id: 80002, name: 'test' },
        transport: { type: 'http', url: 'https://test.com' },
      } as any;

      const provider = toEthersProvider(mockViemPublicClient);

      expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
    });

    it('should return ethers provider unchanged', () => {
      const ethersProvider = new ethers.providers.JsonRpcProvider(
        'https://test.com',
      );
      const result = toEthersProvider(ethersProvider);

      expect(result).toBe(ethersProvider);
    });

    it('should handle non-viem provider correctly', () => {
      const nonViemProvider = {
        send: vi.fn(),
        // This will make it fail the isViemClient check
      } as any;

      const result = toEthersProvider(nonViemProvider);

      expect(result).toBe(nonViemProvider);
    });
  });

  describe('toTacoSigner', () => {
    it('should create signer from viem account', async () => {
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
      } as any;

      const signer = toTacoSigner(mockViemAccount);

      expect(signer).toBeInstanceOf(ViemSignerAdapter);

      const address = await signer.getAddress();
      expect(address).toBe('0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2');
    });

    it('should return ethers signer unchanged', () => {
      const ethersSigner = new ethers.Wallet('0x' + '1'.repeat(64));
      const result = toTacoSigner(ethersSigner);

      expect(result).toBe(ethersSigner);
    });

    it('should handle non-viem signer correctly', () => {
      const nonViemSigner = {
        getAddress: vi.fn(),
        provider: {}, // This will make it fail the isViemAccount check
      } as any;

      const result = toTacoSigner(nonViemSigner);

      expect(result).toBe(nonViemSigner);
    });
  });

  describe('type guards', () => {
    describe('isViemClient', () => {
      it('should identify viem client by chain property', () => {
        const viemClient = {
          chain: { id: 1, name: 'mainnet' },
          getChainId: vi.fn(),
        };

        expect(isViemClient(viemClient)).toBe(true);
      });

      it('should identify viem client by getChainId method', () => {
        const viemClient = {
          getChainId: vi.fn(),
        };

        expect(isViemClient(viemClient)).toBe(true);
      });

      it('should reject ethers provider', () => {
        const ethersProvider = new ethers.providers.JsonRpcProvider();

        expect(isViemClient(ethersProvider)).toBe(false);
      });

      it('should reject object without viem properties', () => {
        const notViemClient = {
          send: vi.fn(),
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
        const notViemAccount = {
          address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
          provider: {}, // This makes it look like an ethers signer
        };

        expect(isViemAccount(notViemAccount)).toBe(false);
      });
    });
  });
});
