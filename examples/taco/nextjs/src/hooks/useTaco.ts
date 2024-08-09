import {
  conditions,
  decrypt,
  Domain,
  EIP4361AuthProvider,
  encrypt,
  initialize,
  ThresholdMessageKit,
} from '@nucypher/taco';
import { ethers } from 'ethers';
import { useCallback, useEffect, useState } from 'react';

export default function useTaco({
  ritualId,
  domain,
  provider,
}: {
  ritualId: number;
  domain: Domain;
  provider: ethers.providers.Provider | undefined;
}) {
  const [isInit, setIsInit] = useState(false);

  useEffect(() => {
    initialize().then(() => setIsInit(true));
  }, []);

  const decryptDataFromBytes = useCallback(
    async (encryptedBytes: Uint8Array, signer: ethers.Signer) => {
      if (!isInit || !provider) {
        return;
      }
      const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
      const authProvider = new EIP4361AuthProvider(provider, signer);
      return decrypt(
        provider,
        domain,
        messageKit,
        authProvider,
      );
    },
    [isInit, provider, domain],
  );

  const encryptDataToBytes = useCallback(
    async (
      message: string,
      condition: conditions.condition.Condition,
      encryptorSigner: ethers.Signer,
    ) => {
      if (!isInit || !provider) return;
      const messageKit = await encrypt(
        provider,
        domain,
        message,
        condition,
        ritualId,
        encryptorSigner,
      );
      return messageKit.toBytes();
    },
    [isInit, provider, domain, ritualId],
  );

  return {
    isInit,
    decryptDataFromBytes,
    encryptDataToBytes,
  };
}
