import { describe, expect, test } from 'vitest';

import { toEthersProvider } from '@nucypher/shared';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

describe.skipIf(!process.env.RUNNING_IN_CI)('Viem-Ethers Adapter Integration Tests', () => {
  describe('ENS Registry', () => {
    test('should properly read ENS registry contract address from viem client converted to ethers provider', async () => {
      // Test with chain that has ENS registry (mainnet)
      // Note: mainnet from viem/chains includes ENS registry configuration
      const mainnetViemClient = createPublicClient({
        chain: mainnet,
        transport: http('https://eth.llamarpc.com'),
      });

      // Convert to ethers provider to verify ENS address mapping
      const ethersProvider = toEthersProvider(mainnetViemClient);

      // Verify ENS registry is properly mapped from viem chain configuration
      const expectedEnsAddress = mainnet.contracts?.ensRegistry?.address;
      expect(ethersProvider.network.ensAddress).toBe(expectedEnsAddress);
      // Also verify it's the known mainnet ENS registry address
      expect(ethersProvider.network.ensAddress).toBe(
        '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      );

      // Test actual ENS name resolution to verify functionality
      const resolvedAddress = await ethersProvider.resolveName('vitalik.eth');
      expect(resolvedAddress).toBeTruthy();
      // Currently vitalik.eth is "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".
      // But it may change in the future. So we only check if it's a valid Ethereum address.
      expect(resolvedAddress).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address format
    });
  });
});
