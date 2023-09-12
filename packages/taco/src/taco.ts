import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import {
  Condition,
  ConditionExpression,
  DkgClient,
  DkgCoordinatorAgent,
  Enrico,
  getPorterUri,
  ThresholdDecrypter,
  toBytes,
} from '@nucypher/shared';
import { ethers } from 'ethers';

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: string,
  condition: Condition,
  ritualId: number,
): Promise<ThresholdMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(provider, ritualId);
  return await encryptLight(message, condition, dkgRitual.dkgPublicKey);
};

export const encryptLight = async (
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
    ritual.dkgParams.threshold,
  );
  return decrypter.retrieveAndDecrypt(provider, messageKit, signer);
};

export const taco = {
  encrypt,
  encryptLight,
  decrypt,
};
