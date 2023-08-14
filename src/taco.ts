import { Ciphertext, ferveoEncrypt } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ThresholdDecrypter } from './characters/cbd-recipient';
import { ConditionExpression } from './conditions';
import { DkgClient } from './dkg';
import { toBytes } from './utils';

export interface TacoMessageKit {
  ciphertext: Ciphertext;
  aad: Uint8Array;
  ritualId: number;
  threshold: number;
}

export const encrypt = async (
  web3Provider: ethers.providers.Web3Provider,
  message: string,
  conditions: ConditionExpression,
  ritualId: number
): Promise<TacoMessageKit> => {
  const dkgRitual = await DkgClient.getFinalizedRitual(web3Provider, ritualId);
  const aad = conditions.asAad();
  const ciphertext = ferveoEncrypt(
    toBytes(message),
    aad,
    dkgRitual.dkgPublicKey
  );
  return {
    ciphertext,
    aad,
    ritualId,
    threshold: dkgRitual.dkgParams.threshold,
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
  // TODO: Need web3Provider to fetch participants from Coordinator to make decryption requests.
  //  Should we put them into the message kit instead?
  //  Consider case where participants are changing over time. Is that an issue we should consider now?
  return decrypter.retrieveAndDecrypt(
    web3Provider,
    condExpr,
    messageKit.ciphertext
  );
};

export const taco = {
  encrypt,
  decrypt,
};
