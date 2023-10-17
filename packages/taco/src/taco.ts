import {
  AccessControlPolicy,
  DkgPublicKey,
  encryptForDkg,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  fromHexString,
  GlobalAllowListAgent,
  toBytes,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import {
  Condition,
  ConditionExpression,
  CustomContextParam
} from './conditions';
import { DkgClient } from './dkg';
import { retrieveAndDecrypt } from './tdec';

export const encrypt = async (
  provider: ethers.providers.Provider,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authSigner: ethers.Signer,
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

  return await encryptWithPublicKey(
    message,
    condition,
    dkgRitual.dkgPublicKey,
    authSigner,
  );
};

export const encryptWithPublicKey = async (
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit> => {
  if (typeof message === 'string') {
    message = toBytes(message);
  }

  const conditionExpr = new ConditionExpression(condition);

  const [ciphertext, authenticatedData] = encryptForDkg(
    message,
    dkgPublicKey,
    conditionExpr.toWASMConditions(),
  );

  const headerHash = keccak256(ciphertext.header.toBytes());
  const authorization = await authSigner.signMessage(fromHexString(headerHash));
  const acp = new AccessControlPolicy(
    authenticatedData,
    fromHexString(authorization),
  );

  return new ThresholdMessageKit(ciphertext, acp);
};

export const decrypt = async (
  provider: ethers.providers.Provider,
  messageKit: ThresholdMessageKit,
  porterUri: string,
  signer?: ethers.Signer,
  customParameters: Record<string, CustomContextParam> = {},
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
    customParameters
  );
};

export const isAuthorized = async (
  provider: ethers.providers.Provider,
  messageKit: ThresholdMessageKit,
  ritualId: number,
) => DkgCoordinatorAgent.isEncryptionAuthorized(provider, ritualId, messageKit);

export const registerEncrypters = async (
  provider: ethers.providers.Provider,
  signer: ethers.Signer,
  ritualId: number,
  encrypters: ChecksumAddress[],
): Promise<void> => {
  await GlobalAllowListAgent.registerEncrypters(
    provider,
    signer,
    ritualId,
    encrypters,
  );
};
