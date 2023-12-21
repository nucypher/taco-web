import {
  conditions,
  decrypt,
  Domain,
  encrypt,
  getPorterUri,
  initialize,
  ThresholdMessageKit,
} from '@nucypher/taco';
import { useCallback, useEffect, useState } from 'react';
import { PublicClient, WalletClient } from 'viem';

export default function useTaco({
  ritualId,
  domain,
}: {
  ritualId: number;
  domain: Domain;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
}) {
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    initialize().then(() => setIsInit(true));
  }, []);

  const decryptDataFromBytes = useCallback(
    async (
      encryptedBytes: Uint8Array,
      publicClient?: PublicClient,
      walletClient?: WalletClient,
    ) => {
      if (!isInit || !publicClient || !walletClient) {
        return;
      }
      const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
      return decrypt(
        publicClient,
        domain,
        messageKit,
        getPorterUri(domain),
        walletClient,
      );
    },
    [isInit, domain],
  );

  const encryptDataToBytes = useCallback(
    async (
      message: string,
      condition: conditions.Condition,
      publicClient?: PublicClient,
      walletClient?: WalletClient,
    ) => {
      if (!isInit || !publicClient || !walletClient) {
        return;
      }
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
    [isInit, domain, ritualId],
  );

  return {
    isInit,
    decryptDataFromBytes,
    encryptDataToBytes,
  };
}
