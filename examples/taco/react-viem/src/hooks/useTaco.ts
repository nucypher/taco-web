import {
  conditions,
  decrypt,
  Domain,
  encrypt,
  initialize,
  ThresholdMessageKit,
} from '@nucypher/taco';
import {
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, http, PublicClient, WalletClient } from 'viem';
import { polygonAmoy } from 'viem/chains';

export default function useTaco({
  ritualId,
  domain,
  publicClient,
  walletClient,
}: {
  ritualId: number;
  domain: Domain;
  publicClient: PublicClient | undefined;
  walletClient: WalletClient | undefined;
}) {
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    initialize().then(() => setIsInit(true));
  }, []);

  const decryptDataFromBytes = useCallback(
    async (encryptedBytes: Uint8Array) => {
      if (!isInit || !publicClient || !walletClient) {
        return;
      }

      const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
      const authProvider = new EIP4361AuthProvider(publicClient, walletClient);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKit);
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProvider,
      );
      let message;
      try {
        message = await decrypt(
          publicClient,
          domain,
          messageKit,
          conditionContext,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          JSON.stringify(error).includes('missing trie node')
        ) {
          // Using MetaMask Provider may cause "missing trie node".
          // Which typically occurs when attempting to query a blockchain state for a specific block that has been pruned from the node's storage.
          // To avoid that, a custom public client is created.
          const remotePublicClient = createPublicClient({
            chain: polygonAmoy, // Using Polygon Amoy for testnet/devnet
            transport: http('https://rpc-amoy.polygon.technology'),
          });
          message = await decrypt(
            remotePublicClient,
            domain,
            messageKit,
            conditionContext,
          );
        } else {
          throw error;
        }
      }
      return message;
    },
    [isInit, publicClient, walletClient, domain],
  );

  const encryptDataToBytes = useCallback(
    async (message: string, condition: conditions.condition.Condition) => {
      if (!isInit || !publicClient || !walletClient) return;
      const messageKit = await encrypt(
        publicClient,
        domain,
        message,
        condition,
        ritualId,
        walletClient,
      );
      return messageKit.toBytes();
    },
    [isInit, publicClient, walletClient, domain, ritualId],
  );

  return {
    isInit,
    decryptDataFromBytes,
    encryptDataToBytes,
  };
}
