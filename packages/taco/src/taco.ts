import {
  AccessControlPolicy,
  DkgPublicKey,
  encryptForDkg,
  SecretKey,
  Signer,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import {
  Condition,
  ConditionExpression,
  DkgCoordinatorAgent,
  getPorterUri,
  toBytes,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { arrayify, keccak256 } from 'ethers/lib/utils';

import { DkgClient } from './dkg';
import { retrieveAndDecrypt } from './tdec';

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
): Promise<ThresholdMessageKit> => {
  // TODO(#264): Enable ritual initialization
  // if (ritualId === undefined) {
  //   ritualId = await DkgClient.initializeRitual(
  //     provider,
  //     this.cohort.ursulaAddresses,
  //     true
  //   );
  // }
  // if (ritualId === undefined) {
  //   // Given that we just initialized the ritual, this should never happen
  //   throw new Error('Ritual ID is undefined');
  // }
  const dkgRitual = await DkgClient.getFinalizedRitual(provider, ritualId);
  return await encryptWithPublicKey(message, condition, dkgRitual.dkgPublicKey);
};

export const encryptWithPublicKey = async (
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner?: Signer,
): Promise<ThresholdMessageKit> => {
  if (typeof message === 'string') {
    message = toBytes(message);
  }

  const conditionExpr = new ConditionExpression(condition);
  if (!authSigner) {
    authSigner = new Signer(SecretKey.random());
  }

  const [ciphertext, authenticatedData] = encryptForDkg(
    message,
    dkgPublicKey,
    conditionExpr.toWASMConditions(),
  );

  const headerHash = keccak256(ciphertext.header.toBytes());
  const authorization = authSigner.sign(arrayify(headerHash));
  const acp = new AccessControlPolicy(
    authenticatedData,
    authorization.toBEBytes(),
  );

  return new ThresholdMessageKit(ciphertext, acp);
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
  return retrieveAndDecrypt(
    provider,
    porterUri,
    messageKit,
    ritualId,
    ritual.threshold,
    signer,
  );
};

export const taco = {
  encrypt,
  encryptWithPublicKey,
  decrypt,
};
