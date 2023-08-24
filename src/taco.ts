import {
  Ciphertext,
  DkgPublicKey,
  ferveoEncrypt,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ThresholdDecrypter } from './characters/cbd-recipient';
import { Condition, ConditionExpression } from './conditions';
import { DkgClient } from './dkg';
import { toBytes } from './utils';

export interface TacoMessageKit {
  ciphertext: Ciphertext;
  aad: Uint8Array;
  // TODO: How do we get rid of these two fields? We need them for decrypting
  // We ritualId in order to fetch the DKG participants and create DecryptionRequests for them
  ritualId: number;
  // We need to know the threshold in order to create DecryptionRequests
  threshold: number;
}

export const encrypt = async (
  web3Provider: ethers.providers.Web3Provider,
  message: string,
  condition: Condition,
  ritualId: number
): Promise<TacoMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(web3Provider, ritualId);
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
  const aad = new ConditionExpression(condition).asAad();
  const ciphertext = ferveoEncrypt(toBytes(message), aad, dkgPublicKey);
  return {
    ciphertext,
    aad,
    threshold,
    ritualId,
  };
};

export const decrypt = async (
  web3Provider: ethers.providers.Web3Provider,
  messageKit: TacoMessageKit,
  porterUri: string
): Promise<Uint8Array> => {
  const decrypter = ThresholdDecrypter.create(
    porterUri,
    messageKit.ritualId,
    messageKit.threshold
  );
  const condExpr = ConditionExpression.fromAad(messageKit.aad);
  // TODO: We need web3Provider to fetch participants from Coordinator to make decryption requests.
  //  Removing this dependency is tied to release of ThresholdMessageKit
  //  Blocked by changes to nucypher-core and nucypher:
  //  https://github.com/nucypher/nucypher/pull/3194
  return decrypter.retrieveAndDecrypt(
    web3Provider,
    condExpr,
    messageKit.ciphertext
  );
};

export const taco = {
  encrypt,
  encryptLight,
  decrypt,
};
