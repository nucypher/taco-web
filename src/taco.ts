import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent } from './agents/coordinator';
import { ThresholdDecrypter } from './characters/cbd-recipient';
import { Enrico } from './characters/enrico';
import { Condition, ConditionExpression } from './conditions';
import { DkgClient } from './dkg';
import { getPorterUri } from './porter';
import { toBytes } from './utils';

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: string,
  condition: Condition,
  ritualId: number
): Promise<ThresholdMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(provider, ritualId);
  return await encryptLight(message, condition, dkgRitual.dkgPublicKey);
};

export const encryptLight = async (
  message: string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey
): Promise<ThresholdMessageKit> => {
  const encrypter = new Enrico(dkgPublicKey);
  const conditionExpr = new ConditionExpression(condition);
  return encrypter.encryptMessageCbd(toBytes(message), conditionExpr);
};

export const decrypt = async (
  provider: ethers.providers.Provider,
  messageKit: ThresholdMessageKit,
  signer?: ethers.Signer,
  porterUri = getPorterUri('tapir')
): Promise<Uint8Array> => {
  const ritualId = await DkgCoordinatorAgent.getRitualIdFromPublicKey(
    provider,
    messageKit.acp.publicKey
  );
  const ritual = await DkgClient.getFinalizedRitual(provider, ritualId);
  const decrypter = ThresholdDecrypter.create(
    porterUri,
    ritualId,
    ritual.threshold
  );
  return decrypter.retrieveAndDecrypt(provider, messageKit, signer);
};

export const taco = {
  encrypt,
  encryptLight,
  decrypt,
};
