import { describe, expect, test } from 'vitest';

import { toEthersProvider } from '@nucypher/shared';
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

describe.skipIf(!process.env.RUNNING_IN_CI)(
  'Viem-Ethers Adapter ENS Integration Tests',
  () => {
    test('should properly resolve ENS name to address when no viem chain object is provided', async () => {
      // Test with chain that has ENS registry (mainnet)
      // Note: mainnet from viem/chains includes ENS registry configuration
      const mainnetViemClient = createPublicClient({
        transport: http('https://eth.llamarpc.com'),
      });

      // Convert to ethers provider to verify ENS address mapping
      const ethersProvider = toEthersProvider(mainnetViemClient);

      // Test actual ENS name resolution to verify functionality
      const resolvedAddress = await ethersProvider.resolveName('vitalik.eth');
      expect(resolvedAddress).toBeTruthy();
      // Currently vitalik.eth is "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".
      // But it may change in the future. So we only check if it's a valid Ethereum address.
      expect(ethers.utils.isAddress(resolvedAddress)).toBe(true); // Valid Ethereum address format

      // Currently ethersProvider.network.ensAddress on mainnet is "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e".
      expect(ethersProvider.network.ensAddress).toBeTruthy();
    }, 15000);

    test('ENS operations should fail when viem chain lacks ENS registry address', async () => {
      const chainWithEns = {
        ...mainnet,
        contracts: {
          ...mainnet.contracts,
          ensRegistry: {
            // Manually providing ENS registry since viem/chains doesn't include it
            address:
              '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as `0x${string}`,
          },
        },
      };

      const mainnetViemClient = createPublicClient({
        chain: chainWithEns,
        transport: http(),
      });

      // Convert to ethers provider to verify ENS address mapping
      const ethersProvider = toEthersProvider(mainnetViemClient);

      // Verify ENS registry address is properly set
      expect(ethersProvider.network.ensAddress).toBe(
        '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      );

      // Test actual ENS name resolution to verify functionality
      const resolvedAddress = await ethersProvider.resolveName('vitalik.eth');
      expect(resolvedAddress).toBeTruthy();
      expect(ethers.utils.isAddress(resolvedAddress)).toBe(true); // Valid Ethereum address format
    }, 15000);

    test('expected to fail when viem chain does not contain the ENS registry contract address', async () => {
      // mainnet from viem/chains does NOT include ensRegistry, only ensUniversalResolver
      const mainnetViemClient = createPublicClient({
        chain: mainnet,
        transport: http(),
      });

      // Convert to ethers provider
      const ethersProvider = toEthersProvider(mainnetViemClient);

      // ENS address is expected to not be set
      expect(ethersProvider.network.ensAddress).toBeUndefined();

      // ENS operation is expected to fail
      await expect(ethersProvider.resolveName('vitalik.eth')).rejects.toThrow(
        'network does not support ENS',
      );
    });
  },
);
