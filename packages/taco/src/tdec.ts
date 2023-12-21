import {
  AccessControlPolicy,
  combineDecryptionSharesSimple,
  Context,
  DecryptionShareSimple,
  DkgPublicKey,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  encryptForDkg,
  FerveoVariant,
  SessionSharedSecret,
  SessionStaticSecret,
  ThresholdDecryptionRequest,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import {
  DkgCoordinatorAgent,
  DkgParticipant,
  Domain,
  PorterClient,
  toBytes,
} from '@nucypher/shared';
import { keccak256 } from 'ethers/lib/utils';
import { PublicClient, WalletClient } from 'viem';
import { signMessage } from 'viem/actions';

import {
  ConditionContext,
  ConditionExpression,
  CustomContextParam,
} from './conditions';

const ERR_DECRYPTION_FAILED = (errors: unknown) =>
  `Threshold of responses not met; TACo decryption failed with errors: ${JSON.stringify(
    errors,
  )}`;
const ERR_RITUAL_ID_MISMATCH = (
  expectedRitualId: number,
  ritualIds: number[],
) => `Ritual id mismatch. Expected ${expectedRitualId}, got ${ritualIds}`;
const ERR_NO_ACCOUNT_FOUND = 'No account found in WalletClient';

export const encryptMessage = async (
  plaintext: Uint8Array | string,
  encryptingKey: DkgPublicKey,
  conditions: ConditionExpression,
  walletClient: WalletClient,
): Promise<ThresholdMessageKit> => {
  const [ciphertext, authenticatedData] = encryptForDkg(
    plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
    encryptingKey,
    conditions.toWASMConditions(),
  );

  const headerHash = keccak256(ciphertext.header.toBytes());
  const account = walletClient.account;
  if (!account) {
    throw new Error(ERR_NO_ACCOUNT_FOUND);
  }
  const authorization = await signMessage(walletClient, {
    message: headerHash,
    account,
  });
  const acp = new AccessControlPolicy(
    authenticatedData,
    toBytes(authorization),
  );

  return new ThresholdMessageKit(ciphertext, acp);
};

// Retrieve and decrypt ciphertext using provider and condition expression
export const retrieveAndDecrypt = async (
  publicClient: PublicClient,
  domain: Domain,
  porterUri: string,
  thresholdMessageKit: ThresholdMessageKit,
  ritualId: number,
  threshold: number,
  walletClient?: WalletClient,
  customParameters?: Record<string, CustomContextParam>,
): Promise<Uint8Array> => {
  const decryptionShares = await retrieve(
    publicClient,
    domain,
    porterUri,
    thresholdMessageKit,
    ritualId,
    threshold,
    walletClient,
    customParameters,
  );
  const sharedSecret = combineDecryptionSharesSimple(decryptionShares);
  return thresholdMessageKit.decryptWithSharedSecret(sharedSecret);
};

// Retrieve decryption shares
const retrieve = async (
  publicClient: PublicClient,
  domain: Domain,
  porterUri: string,
  thresholdMessageKit: ThresholdMessageKit,
  ritualId: number,
  threshold: number,
  walletClient?: WalletClient,
  customParameters?: Record<string, CustomContextParam>,
): Promise<DecryptionShareSimple[]> => {
  const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
    publicClient,
    domain,
    ritualId,
  );
  const wasmContext = await ConditionContext.fromConditions(
    publicClient,
    thresholdMessageKit.acp.conditions,
    walletClient,
    customParameters,
  ).toWASMContext();
  const { sharedSecrets, encryptedRequests } = await makeDecryptionRequests(
    ritualId,
    wasmContext,
    dkgParticipants,
    thresholdMessageKit,
  );

  const porter = new PorterClient(porterUri);
  const { encryptedResponses, errors } = await porter.tacoDecrypt(
    encryptedRequests,
    threshold,
  );
  if (Object.keys(encryptedResponses).length < threshold) {
    throw new Error(ERR_DECRYPTION_FAILED(errors));
  }

  return makeDecryptionShares(encryptedResponses, sharedSecrets, ritualId);
};

const makeDecryptionShares = (
  encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>,
  sessionSharedSecret: Record<string, SessionSharedSecret>,
  expectedRitualId: number,
) => {
  const decryptedResponses = Object.entries(encryptedResponses).map(
    ([ursula, response]) => response.decrypt(sessionSharedSecret[ursula]),
  );

  const ritualIds = decryptedResponses.map(({ ritualId }) => ritualId);
  if (ritualIds.some((ritualId) => ritualId !== expectedRitualId)) {
    throw new Error(ERR_RITUAL_ID_MISMATCH(expectedRitualId, ritualIds));
  }

  return decryptedResponses.map(({ decryptionShare }) =>
    DecryptionShareSimple.fromBytes(decryptionShare),
  );
};

const makeDecryptionRequests = async (
  ritualId: number,
  wasmContext: Context,
  dkgParticipants: Array<DkgParticipant>,
  thresholdMessageKit: ThresholdMessageKit,
): Promise<{
  sharedSecrets: Record<string, SessionSharedSecret>;
  encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>;
}> => {
  const decryptionRequest = new ThresholdDecryptionRequest(
    ritualId,
    FerveoVariant.simple,
    thresholdMessageKit.ciphertextHeader,
    thresholdMessageKit.acp,
    wasmContext,
  );

  const ephemeralSessionKey = makeSessionKey();

  // Compute shared secrets for each participant
  const sharedSecrets: Record<string, SessionSharedSecret> = Object.fromEntries(
    dkgParticipants.map(({ provider, decryptionRequestStaticKey }) => {
      const sharedSecret = ephemeralSessionKey.deriveSharedSecret(
        decryptionRequestStaticKey,
      );
      return [provider, sharedSecret];
    }),
  );

  // Create encrypted requests for each participant
  const encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest> =
    Object.fromEntries(
      Object.entries(sharedSecrets).map(([provider, sessionSharedSecret]) => {
        const encryptedRequest = decryptionRequest.encrypt(
          sessionSharedSecret,
          ephemeralSessionKey.publicKey(),
        );
        return [provider, encryptedRequest];
      }),
    );

  return { sharedSecrets, encryptedRequests };
};

// Moving to a separate function to make it easier to mock
const makeSessionKey = () => SessionStaticSecret.random();
