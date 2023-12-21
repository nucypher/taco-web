import { vi } from 'vitest';

vi.mock('viem/actions', () => ({
  ...vi.importActual('viem/actions'),
  getBlock: vi.fn().mockResolvedValue({
    timestamp: 1000,
  }),
  getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
  signTypedData: vi
    .fn()
    .mockResolvedValue('0x1234567890123456789012345678901234567890'),
  signMessage: vi
    .fn()
    .mockResolvedValue('0x1234567890123456789012345678901234567890'),
  getAccounts: vi
    .fn()
    .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
}));
