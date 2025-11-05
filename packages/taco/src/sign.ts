import {
  EncryptedThresholdSigningRequest,
  EncryptedThresholdSigningResponse,
  SessionSharedSecret,
  SessionStaticSecret,
  ThresholdSigningRequest,
  ThresholdSigningResponse,
} from '@nucypher/nucypher-core';
import {
  convertUserOperationToPython,
  Domain,
  fromHexString,
  getPorterUris,
  PorterClient,
  SigningCoordinatorAgent,
  TacoSignature,
  toHexString,
  UserOperation,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { CompoundCondition } from './conditions/compound-condition';
import { Condition } from './conditions/condition';
import { ConditionExpression } from './conditions/condition-expr';
import { ConditionContext } from './conditions/context';

const ERR_INSUFFICIENT_SIGNATURES = (errors: unknown) =>
  `Threshold of signatures not met; TACo signing failed with errors: ${JSON.stringify(
    errors,
  )}`;
const ERR_MISMATCHED_HASHES = (
  hashToSignatures: Map<string, { [ursulaAddress: string]: TacoSignature }>,
) =>
  `Threshold of signatures not met; multiple mismatched hashes found: ${JSON.stringify(
    Object.fromEntries(hashToSignatures.entries()),
  )}`;
const ERR_COHORT_ID_MISMATCH = (
  expectedCohortId: number,
  cohortIds: number[],
) => `Cohort id mismatch. Expected ${expectedCohortId}, got ${cohortIds}`;

export type SignResult = {
  messageHash: string;
  aggregatedSignature: string;
  signingResults: { [ursulaAddress: string]: TacoSignature };
};

/**
 * Creates encrypted signing requests for each signer in the cohort.
 * Mirrors the pattern from makeDecryptionRequests in tdec.ts
 *
 * @param cohortId - The signing cohort ID
 * @param chainId - The blockchain chain ID
 * @param conditionContext - The condition context for evaluation
 * @param signers - Array of signers with their static keys
 * @param userOp - The user operation to sign
 * @param aaVersion - The account abstraction version
 * @returns Shared secrets and encrypted requests for each signer
 */
const makeSigningRequests = async (
  cohortId: number,
  chainId: number,
  conditionContext: ConditionContext,
  signers: Awaited<ReturnType<typeof SigningCoordinatorAgent.getParticipants>>,
  userOp: UserOperation,
  aaVersion: string,
): Promise<{
  sharedSecrets: Record<string, SessionSharedSecret>;
  encryptedRequests: Record<string, EncryptedThresholdSigningRequest>;
}> => {
  const coreContext = await conditionContext.toCoreContext();
  const pythonUserOp = convertUserOperationToPython(userOp);

  const signingRequest = new ThresholdSigningRequest(
    cohortId,
    chainId,
    pythonUserOp,
    aaVersion,
    coreContext,
    'userop',
  );

  // Generate ephemeral session key for this request
  const ephemeralSessionKey = makeSessionKey();

  // Compute shared secrets for each signer using ECDH
  const sharedSecrets: Record<string, SessionSharedSecret> = Object.fromEntries(
    signers.map(({ provider, signingRequestStaticKey }) => {
      const sharedSecret = ephemeralSessionKey.deriveSharedSecret(
        signingRequestStaticKey,
      );
      return [provider, sharedSecret];
    }),
  );

  // Create encrypted requests for each signer
  const encryptedRequests: Record<string, EncryptedThresholdSigningRequest> =
    Object.fromEntries(
      Object.entries(sharedSecrets).map(([provider, sessionSharedSecret]) => {
        const encryptedRequest = signingRequest.encrypt(
          sessionSharedSecret,
          ephemeralSessionKey.publicKey(),
        );
        return [provider, encryptedRequest];
      }),
    );

  return { sharedSecrets, encryptedRequests };
};

/**
 * Decrypts signing responses from signers.
 * Mirrors the pattern from makeDecryptionShares in tdec.ts
 *
 * @param encryptedResponses - Encrypted responses from signers
 * @param sessionSharedSecrets - Shared secrets for decryption
 * @param expectedCohortId - Expected cohort ID for validation
 * @returns Decrypted signatures by provider address
 */
const decryptSigningResponses = (
  encryptedResponses: Record<string, EncryptedThresholdSigningResponse>,
  sessionSharedSecrets: Record<string, SessionSharedSecret>,
  expectedCohortId: number,
): Record<string, TacoSignature> => {
  const decryptedResponses: Array<[string, ThresholdSigningResponse]> =
    Object.entries(encryptedResponses).map(([provider, response]) => {
      const decrypted = response.decrypt(sessionSharedSecrets[provider]);
      return [provider, decrypted];
    });

  // Validate cohort IDs match
  const cohortIds = decryptedResponses.map(([_, resp]) => resp.cohortId);
  if (cohortIds.some((cohortId) => cohortId !== expectedCohortId)) {
    throw new Error(ERR_COHORT_ID_MISMATCH(expectedCohortId, cohortIds));
  }

  // Convert to TacoSignature format
  return Object.fromEntries(
    decryptedResponses.map(([provider, resp]) => [
      provider,
      {
        messageHash: resp.messageHash,
        signature: resp.signature,
        signerAddress: resp.signerAddress,
      },
    ]),
  );
};

// Moving to a separate function to make it easier to mock
const makeSessionKey = () => SessionStaticSecret.random();

function aggregateSignatures(
  signaturesByAddress: {
    [checksumAddress: string]: TacoSignature;
  },
  threshold: number,
): string {
  // Aggregate hex signatures by concatenating them; being careful to remove the '0x' prefix from each signature except the first one.
  const signatures = Object.values(signaturesByAddress)
    .map((sig) => sig.signature)
    .slice(0, threshold);
  if (signatures.length === 1) {
    return signatures[0];
  }
  // Concatenate signatures
  const allBytes = signatures.flatMap((hex) => Array.from(fromHexString(hex)));
  return `0x${toHexString(new Uint8Array(allBytes))}`;
}

/**
 * Signs a UserOperation using encrypted signing requests.
 *
 * This function implements end-to-end encryption for signing requests,
 * mirroring the pattern used for decryption requests in tdec.ts.
 *
 * @param provider - The Ethereum provider to use for signing.
 * @param domain - The TACo domain being used.
 * @param cohortId - The cohort ID that identifies the signing cohort.
 * @param chainId - The chain ID for the signing operation.
 * @param userOp - The UserOperation to be signed.
 * @param aaVersion - The AA version of the account abstraction to use for signing.
 * @param context - Optional condition context for the context variable resolution.
 * @param porterUris - Optional URIs for the Porter service. If not provided, will fetch the default URIs from the domain.
 * @returns A promise that resolves to a SignResult containing the message hash, aggregated signature, and signing results from the Porter service.
 * @throws An error if the signing process fails due to insufficient signatures or mismatched hashes.
 */
export async function signUserOp(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  userOp: UserOperation,
  aaVersion: 'mdt' | '0.8.0' | string,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<SignResult> {
  const porterUrisFull: string[] = porterUris
    ? porterUris
    : await getPorterUris(domain);
  const porter = new PorterClient(porterUrisFull);

  const signers = await SigningCoordinatorAgent.getParticipants(
    provider,
    domain,
    cohortId,
  );

  const threshold = await SigningCoordinatorAgent.getThreshold(
    provider,
    domain,
    cohortId,
  );

  // Create condition context if not provided
  const conditionContext =
    context || new ConditionContext(new CompoundCondition({}));

  // Encrypt signing requests
  const { sharedSecrets, encryptedRequests } = await makeSigningRequests(
    cohortId,
    chainId,
    conditionContext,
    signers,
    userOp,
    aaVersion,
  );

  // Send encrypted requests to Porter
  const { encryptedResponses, errors } = await porter.signUserOp(
    encryptedRequests,
    threshold,
  );

  if (Object.keys(encryptedResponses).length < threshold) {
    throw new Error(ERR_INSUFFICIENT_SIGNATURES(errors));
  }

  // Decrypt responses
  const decryptedSignatures = decryptSigningResponses(
    encryptedResponses,
    sharedSecrets,
    cohortId,
  );

  const porterSignResult = {
    signingResults: decryptedSignatures,
    errors,
  };

  const hashToSignatures: Map<
    string,
    { [ursulaAddress: string]: TacoSignature }
  > = new Map();

  // Single pass: decode signatures and populate signingResults
  for (const [ursulaAddress, signature] of Object.entries<TacoSignature>(
    porterSignResult.signingResults,
  )) {
    // For non-optimistic: track hashes and group signatures for aggregation
    const hash = signature.messageHash;
    if (!hashToSignatures.has(hash)) {
      hashToSignatures.set(hash, {});
    }
    hashToSignatures.get(hash)![ursulaAddress] = signature;
  }

  let messageHash = undefined;
  let signaturesToAggregate = undefined;
  for (const [hash, signatures] of hashToSignatures.entries()) {
    if (Object.keys(signatures).length >= threshold) {
      signaturesToAggregate = signatures;
      messageHash = hash;
      break;
    }
  }

  // Insufficient signatures for a message hash to meet the threshold
  if (!messageHash || !signaturesToAggregate) {
    if (
      hashToSignatures.size > 1 &&
      Object.keys(porterSignResult.errors).length < signers.length - threshold
    ) {
      // Two things are true:
      // 1. we have multiple hashes, which means we have mismatched hashes from different nodes
      //    we don't really expect this to happen (other than some malicious nodes)
      // 2. number of errors still could have allowed for a threshold of signatures
      console.error(
        'Porter returned mismatched message hashes:',
        hashToSignatures,
      );
      throw new Error(ERR_MISMATCHED_HASHES(hashToSignatures));
    } else {
      throw new Error(ERR_INSUFFICIENT_SIGNATURES(porterSignResult.errors));
    }
  }

  const aggregatedSignature = aggregateSignatures(
    signaturesToAggregate,
    threshold,
  );

  return {
    messageHash,
    aggregatedSignature,
    signingResults: porterSignResult.signingResults,
  };
}

export async function setSigningCohortConditions(
  provider: ethers.providers.JsonRpcProvider,
  domain: Domain,
  conditions: Condition,
  cohortId: number,
  chainId: number,
  signer: ethers.Signer,
): Promise<ethers.ContractTransaction> {
  // Convert Condition to ConditionExpression, then to JSON, then to bytes
  const conditionExpression = new ConditionExpression(conditions);
  const conditionsJson = conditionExpression.toJson();
  const conditionsBytes = ethers.utils.toUtf8Bytes(conditionsJson);

  // Set conditions on the SigningCoordinator contract
  return await SigningCoordinatorAgent.setSigningCohortConditions(
    provider,
    domain,
    cohortId,
    chainId,
    conditionsBytes,
    signer,
  );
}
