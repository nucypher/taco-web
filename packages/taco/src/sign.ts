import {
  convertUserOperationToPython,
  Domain,
  fromHexString,
  getPorterUris,
  PorterClient,
  SigningCoordinatorAgent,
  TacoSignature,
  TacoSignResult,
  toBase64,
  toHexString,
  UserOperation,
  UserOperationSignatureRequest,
} from '@nucypher/shared';
import { ethers } from 'ethers';

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
  errors: Record<string, string>;
};

function aggregateSignatures(signaturesByAddress: {
  [checksumAddress: string]: TacoSignature;
}): string {
  // Aggregate hex signatures by concatenating them; being carefule to remove the '0x' prefix from each signature except the first one.
  const signatures = Object.values(signaturesByAddress).map(
    (sig) => sig.signature,
  );
  if (signatures.length === 1) {
    return signatures[0];
  }
  // Concatenate signatures
  const allBytes = signatures.flatMap((hex) => Array.from(fromHexString(hex)));
  return `0x${toHexString(new Uint8Array(allBytes))}`;
}

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

  const pythonUserOp = convertUserOperationToPython(userOp);

  const signingRequest = new UserOperationSignatureRequest(
    pythonUserOp,
    aaVersion,
    cohortId,
    chainId,
    context || {},
    'userop',
  );

  const signingRequests: Record<string, string> = Object.fromEntries(
    signers.map((signer) => [
      signer.provider,
      toBase64(signingRequest.toBytes()),
    ]),
  );

  // Build signing request for the user operation
  const porterSignResult: TacoSignResult = await porter.signUserOp(
    signingRequests,
    threshold,
  );

  const hashToSignatures: Map<
    string,
    { [ursulaAddress: string]: TacoSignature }
  > = new Map();

  // Single pass: decode signatures and populate signingResults
  for (const [ursulaAddress, signature] of Object.entries(
    porterSignResult.signingResults || {},
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
      Object.keys(porterSignResult.errors || {}).length <
        signers.length - threshold
    ) {
      // Two things are true:
      // 1. we have multiple hashes, which means we have mismatched hashes from different nodes
      //    we don't really expect this to happen (other than some malicious nodes)
      // 2. number of errors still could have allowed for a threshold of signatures
      throw new Error(ERR_MISMATCHED_HASHES(hashToSignatures));
    } else {
      throw new Error(
        ERR_INSUFFICIENT_SIGNATURES(porterSignResult.errors || {}),
      );
    }
  }

  const aggregatedSignature = aggregateSignatures(signaturesToAggregate);

  return {
    messageHash,
    aggregatedSignature,
    signingResults: porterSignResult.signingResults || {},
    errors: porterSignResult.errors || {},
  };
}
