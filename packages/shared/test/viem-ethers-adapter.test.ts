/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { ethers } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPublicClient, fallback, http, webSocket } from 'viem';
import { fromHexString } from '../src';
import { toEthersProvider, toTacoSigner } from '../src/adapters';
import { viemClientToProvider } from '../src/viem/ethers-adapter';
import { ViemSignerAdapter } from '../src/viem/signer-adapter';
import { isViemAccount, isViemClient } from '../src/viem/type-guards';

describe('viem ethers adapter', () => {
  const PRIVATE_KEY =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 32-byte hex

  describe('viemClientToProvider', () => {
    let viemClientConfig: any;

    beforeEach(() => {
      viemClientConfig = {
        chain: {
          id: 80002,
          name: 'Polygon Amoy',
          contracts: {
            ensRegistry: { address: '0x123' },
          },
        },
        transport: http('https://rpc.ankr.com/polygon_amoy'),
      };
    });

    it('should convert to ethers provider with single transport', () => {
      const viemClient = createPublicClient(viemClientConfig);
      const provider = new viemClientToProvider(viemClient);
      expect(provider).toBeInstanceOf(ethers.providers.JsonRpcProvider);
      expect(provider.connection.url).toBe('https://rpc.ankr.com/polygon_amoy');
      expect(provider.network.chainId).toBe(80002);
      expect(provider.network.name).toBe('Polygon Amoy');
      expect(provider.network.ensAddress).toBe('0x123');
    });

    it('should throw error when converting to ethers provider with fallback transport', () => {
      const fallbackClientConfig = {
        ...viemClientConfig,
        transport: fallback([
          http('https://rpc1.example.com'),
          http('https://rpc2.example.com'),
        ]),
      };
      const fallbackClient = createPublicClient(fallbackClientConfig);
      expect(() => viemClientToProvider(fallbackClient)).toThrow(
        'Fallback transport not supported',
      );
    });

    it('should throw error when converting to ethers provider with webSocket transport', () => {
      const webSocketClientConfig = {
        ...viemClientConfig,
        transport: webSocket('wss://example.com'),
      };
      const webSocketClient = createPublicClient(webSocketClientConfig);
      expect(() => viemClientToProvider(webSocketClient)).toThrow(
        'WebSocket transport not supported',
      );
    });

    // TODO: this needs to be better tested i.e. tested with an actual custom transport from viem that uses EIP1193
    it('should convert to ethers provider with custom transport (browser injected)', () => {
      const mockEIP1193Provider = {
        request: vi.fn(),
      };

      const mockCustomClient = {
        ...viemClientConfig,
        transport: {
          type: 'custom',
          value: {
            provider: mockEIP1193Provider,
          },
        },
      };

      const provider = viemClientToProvider(mockCustomClient);
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('Web3Provider');
    });

    // TODO: this needs to be better tested i.e. tested with an actual custom transport from viem
    it('should throw error for custom transport without provider or URL', () => {
      const mockCustomClient = {
        ...viemClientConfig,
        transport: {
          type: 'custom',
          value: {},
        },
      };

      expect(() => viemClientToProvider(mockCustomClient)).toThrow(
        'Custom non-EIP-1193 provider transport not supported',
      );
    });

    it('should handle missing chain', () => {
      const clientWithoutChainConfig = {
        ...viemClientConfig,
        chain: undefined,
      };

      const clientWithoutChain = createPublicClient(clientWithoutChainConfig);
      expect(() => viemClientToProvider(clientWithoutChain)).toThrow(
        'Client must have a chain configured',
      );
    });

    it('should handle missing transport URL', () => {
      const clientWithoutUrlConfig = {
        ...viemClientConfig,
        transport: undefined, // empty string URL
      };
      expect(() => viemClientToProvider(clientWithoutUrlConfig)).toThrow(
        'Transport must have a URL',
      );
    });
  });

  describe('ViemSignerAdapter', () => {
    const viemAccount = privateKeyToAccount(PRIVATE_KEY);
    const ethersSigner = new ethers.Wallet(PRIVATE_KEY);

    it('should create signer without provider', () => {
      const viemAdaptedSigner = new ViemSignerAdapter(viemAccount);
      expect(viemAdaptedSigner).toBeInstanceOf(ViemSignerAdapter);
    });

    it('should get address from viem account', async () => {
      const viemAdaptedSigner = new ViemSignerAdapter(viemAccount);

      const address = await viemAdaptedSigner.getAddress();
      expect(address).toBe(ethersSigner.address);
    });

    it('should sign string message', async () => {
      const message = 'test message';
      const viemAdaptedSigner = new ViemSignerAdapter(viemAccount);
      const viemSignature = await viemAdaptedSigner.signMessage(message);

      const ethersSignature = await ethersSigner.signMessage(message);
      expect(viemSignature).toBe(ethersSignature);
    });

    it('should sign Uint8Array message', async () => {
      const viemAdaptedSigner = new ViemSignerAdapter(viemAccount);
      const messageBytes = fromHexString('0xdeadbeef');

      const viemSignature = await viemAdaptedSigner.signMessage(messageBytes);

      const ethersSignature = await ethersSigner.signMessage(messageBytes);
      expect(viemSignature).toBe(ethersSignature);
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
      const viemClient = createPublicClient({
        chain: {
          id: 80002,
          name: 'Polygon Amoy',
        },
        transport: http('https://test.com'),
      });
      const provider = toEthersProvider(viemClient);
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
    const PRIVATE_KEY =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 32-byte hex

    it('should create signer from viem account', async () => {
      const viemAccount = privateKeyToAccount(PRIVATE_KEY);
      const signer = toTacoSigner(viemAccount);

      expect(signer).toBeInstanceOf(ViemSignerAdapter);

      const address = await signer.getAddress();
      expect(address).toBe(viemAccount.address);
    });

    it('should return ethers signer unchanged', () => {
      const ethersSigner = new ethers.Wallet(PRIVATE_KEY);
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
      it('should identify actual viem client', () => {
        const viemClient = createPublicClient({
          chain: {
            id: 80002,
            name: 'Polygon Amoy',
          },
          transport: http('https://test.com'),
        });
        expect(isViemClient(viemClient)).toBe(true);
      });
      it('should identify viem client by chain property', () => {
        const viemClientByChain = {
          chain: { id: 1, name: 'mainnet' },
          getChainId: vi.fn(),
        };
        expect(isViemClient(viemClientByChain)).toBe(true);
      });

      it('should identify viem client by getChainId method', () => {
        const viemClientByGetChainId = {
          getChainId: vi.fn(),
        };

        expect(isViemClient(viemClientByGetChainId)).toBe(true);
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
      it('should identify actual viem account', () => {
        const viemAccount = privateKeyToAccount(PRIVATE_KEY);
        expect(isViemAccount(viemAccount)).toBe(true);
      });
      it('should identify viem account by address property', () => {
        const viemAccountByAddress = {
          address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        };

        expect(isViemAccount(viemAccountByAddress)).toBe(true);
      });

      it('should reject ethers signer', () => {
        const ethersSigner = new ethers.Wallet(PRIVATE_KEY);
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
