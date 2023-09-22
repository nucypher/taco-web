import {
  Condition,
  ConditionExpression,
  DkgClient,
  DkgCoordinatorAgent,
  toBytes,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { ThresholdDecrypter } from './cbd-recipient';

import {
  DkgPublicKey,
  Enrico,
  getPorterUri,
  ThresholdMessageKit,
} from './index';

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: string,
  condition: Condition,
  ritualId: number,
): Promise<ThresholdMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(provider, ritualId);
  return await encryptWithPublicKey(message, condition, dkgRitual.dkgPublicKey);
};

export const encryptWithPublicKey = async (
  message: string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
): Promise<ThresholdMessageKit> => {
  const encrypter = new Enrico(dkgPublicKey);
  const conditionExpr = new ConditionExpression(condition);
  return encrypter.encryptMessageCbd(toBytes(message), conditionExpr);
};

export const decrypt = async (
  provider: ethers.providers.Provider,
  messageKit: ThresholdMessageKit,
  signer?: ethers.Signer,
  porterUri = getPorterUri('tapir'),
): Promise<Uint8Array> => {
  const ritualId = await DkgCoordinatorAgent.getRitualIdFromPublicKey(
    provider,
    messageKit.acp.publicKey,
  );
  const ritual = await DkgClient.getFinalizedRitual(provider, ritualId);
  const decrypter = ThresholdDecrypter.create(
    porterUri,
    ritualId,
    ritual.threshold,
  );
  return decrypter.retrieveAndDecrypt(provider, messageKit, signer);
};

export const taco = {
  encrypt,
  encryptWithPublicKey,
  decrypt,
};
