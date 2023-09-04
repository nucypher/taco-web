import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ThresholdDecrypter } from './characters/cbd-recipient';
import { Enrico } from './characters/enrico';
import { Condition, ConditionExpression } from './conditions';
import { DkgClient } from './dkg';
import { getPorterUri } from './porter';
import { toBytes } from './utils';

export interface TacoMessageKit {
  thresholdMessageKit: ThresholdMessageKit;
  conditionExpr: ConditionExpression;
  // TODO: How do we get rid of these two fields? We need them for decrypting
  // We ritualId in order to fetch the DKG participants and create DecryptionRequests for them
  ritualId: number;
  // We need to know the threshold in order to create DecryptionRequests
  threshold: number;
}

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: string,
  condition: Condition,
  ritualId: number
): Promise<TacoMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(provider, ritualId);
  return await encryptLight(
    message,
    condition,
    dkgRitual.dkgPublicKey,
    dkgRitual.dkgParams.threshold,
    ritualId
  );
};

export const encryptLight = async (
  message: string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  // TODO: Remove these parameters after fixing TacoMessageKit
  threshold: number,
  ritualId: number
): Promise<TacoMessageKit> => {
  const encrypter = new Enrico(dkgPublicKey);
  const conditionExpr = new ConditionExpression(condition);
  const thresholdMessageKit = await encrypter.encryptMessageCbd(
    toBytes(message),
    conditionExpr
  );
  return {
    thresholdMessageKit,
    threshold,
    ritualId,
    conditionExpr,
  };
};

export const decrypt = async (
  provider: ethers.providers.Provider,
  messageKit: TacoMessageKit,
  signer?: ethers.Signer,
  porterUri = getPorterUri('tapir')
): Promise<Uint8Array> => {
  const decrypter = ThresholdDecrypter.create(
    porterUri,
    messageKit.ritualId,
    messageKit.threshold
  );
  return decrypter.retrieveAndDecrypt(
    provider,
    messageKit.thresholdMessageKit,
    signer
  );
};

export const taco = {
  encrypt,
  encryptLight,
  decrypt,
};
