import {
  EncryptedThresholdSignatureRequest,
  EncryptedThresholdSignatureResponse,
  PackedUserOperationSignatureRequest,
  SessionSharedSecret,
  SessionStaticSecret,
  SignatureResponse,
  UserOperationSignatureRequest,
} from '@nucypher/nucypher-core';
import {
  Domain,
  fromHexString,
  getPorterUris,
  isPackedUserOperation,
  PackedUserOperationToSign,
  PorterClient,
  SignerInfo,
  SigningCoordinatorAgent,
  TacoSignature,
  toCorePackedUserOperation,
  toCoreUserOperation,
  toHexString,
  UserOperationToSign,
} from '@nucypher/shared';
import { ethers } from 'ethers';

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

export type SignResult = {
  messageHash: string;
  aggregatedSignature: string;
  signingResults: { [ursulaAddress: string]: TacoSignature };
};

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

async function makeSigningRequests(
  cohortId: number,
  chainId: number,
  signers: Array<SignerInfo>,
  userOp: UserOperationToSign | PackedUserOperationToSign,
  aaVersion: string,
  conditionContext?: ConditionContext,
): Promise<{
  sharedSecrets: Record<string, SessionSharedSecret>;
  encryptedRequests: Record<string, EncryptedThresholdSignatureRequest>;
}> {
  const coreContext = conditionContext
    ? await conditionContext.toCoreContext()
    : null;

  let signingRequest:
    | PackedUserOperationSignatureRequest
    | UserOperationSignatureRequest;
  if (isPackedUserOperation(userOp)) {
    const corePackedUserOp = toCorePackedUserOperation(userOp);
    signingRequest = new PackedUserOperationSignatureRequest(
      corePackedUserOp,
      cohortId,
      BigInt(chainId),
      aaVersion,
      coreContext,
    );
  } else {
    const coreUserOp = toCoreUserOperation(userOp);
    signingRequest = new UserOperationSignatureRequest(
      coreUserOp,
      cohortId,
      BigInt(chainId),
      aaVersion,
      coreContext,
    );
  }

  const ephemeralSessionKey = SessionStaticSecret.random();

  const sharedSecrets: Record<string, SessionSharedSecret> = Object.fromEntries(
    signers.map(({ provider, signingRequestStaticKey }) => {
      const sharedSecret = ephemeralSessionKey.deriveSharedSecret(
        signingRequestStaticKey,
      );
      return [provider, sharedSecret];
    }),
  );

  const encryptedRequests: Record<string, EncryptedThresholdSignatureRequest> =
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
}

/**
 * Signs a UserOperation.
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
  userOp: UserOperationToSign | PackedUserOperationToSign,
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

  const { sharedSecrets, encryptedRequests } = await makeSigningRequests(
    cohortId,
    chainId,
    signers,
    userOp,
    aaVersion,
    context,
  );

  // Build signing request for the user operation
  const { encryptedResponses, errors } = await porter.signUserOp(
    encryptedRequests,
    threshold,
  );
  if (Object.keys(encryptedResponses).length < threshold) {
    // not enough signatures returned
    throw new Error(ERR_INSUFFICIENT_SIGNATURES(errors));
  }

  const signaturesToAggregate = collectSignatures(
    encryptedResponses,
    sharedSecrets,
    threshold,
  );

  const aggregatedSignature = aggregateSignatures(
    signaturesToAggregate,
    threshold,
  );

  return {
    messageHash: Object.values(signaturesToAggregate)[0].messageHash,
    aggregatedSignature,
    signingResults: signaturesToAggregate,
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

function decryptSignatureResponses(
  encryptedResponses: Record<string, EncryptedThresholdSignatureResponse>,
  sharedSecrets: Record<string, SessionSharedSecret>,
): Record<string, TacoSignature> {
  const decryptedResponses: Record<string, SignatureResponse> =
    Object.fromEntries(
      Object.entries(encryptedResponses).map(
        ([ursulaAddress, encryptedResponse]) => [
          ursulaAddress,
          encryptedResponse.decrypt(sharedSecrets[ursulaAddress]),
        ],
      ),
    );

  const tacoSignatures: Record<string, TacoSignature> = Object.fromEntries(
    Object.entries(decryptedResponses).map(
      ([ursulaAddress, signatureResponse]) => [
        ursulaAddress,
        {
          messageHash: `0x${toHexString(signatureResponse.hash)}`,
          signature: `0x${toHexString(signatureResponse.signature)}`,
          signerAddress: signatureResponse.signer,
        },
      ],
    ),
  );

  return tacoSignatures;
}

function collectSignatures(
  encryptedResponses: Record<string, EncryptedThresholdSignatureResponse>,
  sharedSecrets: Record<string, SessionSharedSecret>,
  threshold: number,
): Record<string, TacoSignature> {
  const decryptedSignatures = decryptSignatureResponses(
    encryptedResponses,
    sharedSecrets,
  );

  const hashToSignatures: Map<
    string,
    Record<string, TacoSignature>
  > = new Map();

  // Single pass: decode signatures and populate signingResults
  for (const [ursulaAddress, signature] of Object.entries(
    decryptedSignatures,
  )) {
    // For non-optimistic: track hashes and group signatures for aggregation
    const hash = signature.messageHash;
    if (!hashToSignatures.has(hash)) {
      hashToSignatures.set(hash, {});
    }
    hashToSignatures.get(hash)![ursulaAddress] = signature;
  }

  // Find a hash that meets the threshold
  let signaturesToAggregate = undefined;
  for (const signatures of hashToSignatures.values()) {
    if (Object.keys(signatures).length >= threshold) {
      signaturesToAggregate = signatures;
      break;
    }
  }

  // Insufficient signatures for a message hash to meet the threshold
  if (!signaturesToAggregate) {
    //we have multiple hashes, which means we have mismatched hashes from different nodes
    //    we don't really expect this to happen (other than some malicious nodes)
    console.error(
      'Porter returned mismatched message hashes:',
      hashToSignatures,
    );
    throw new Error(ERR_MISMATCHED_HASHES(hashToSignatures));
  }

  return signaturesToAggregate;
}
