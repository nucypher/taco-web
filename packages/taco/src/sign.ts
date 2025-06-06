import { Domain, PorterClient } from '@nucypher/shared';

import { SigningOptions, SignResult, UserOperation } from './types';

// Core signing functions
export async function sign191(
  payload: Uint8Array | string,
  cohortId: number,
  domain: Domain,
  options: SigningOptions = { optimistic: true, returnAggregated: true }
): Promise<SignResult> {
  const porter = new PorterClient(domain);
  
  // Convert string payload to Uint8Array if needed
  const payloadBytes = typeof payload === 'string' 
    ? new TextEncoder().encode(payload)
    : payload;

  const result = await porter.sign191(
    payloadBytes,
    cohortId,
    options
  );

  return {
    digest: result.digest,
    aggregatedSignature: result.aggregatedSignature,
    signingResults: result.signingResults,
    type: result.type
  };
}

export async function signUserOp(
  userOp: UserOperation,
  chainId: number,
  accountSpec: "zerodev" | "kernel" | "metamask" | "safe" | string,
  entryPointVersion: "v0.6" | "v0.7" | "v0.8",
  cohortId: number,
  domain: Domain,
  options: SigningOptions = { optimistic: true, returnAggregated: true }
): Promise<SignResult> {
  const porter = new PorterClient(domain);

  const result = await porter.signUserOp(
    userOp,
    chainId,
    accountSpec,
    entryPointVersion,
    cohortId,
    options
  );

  return {
    digest: result.digest,
    aggregatedSignature: result.aggregatedSignature,
    signingResults: result.signingResults,
    type: result.type
  };
}