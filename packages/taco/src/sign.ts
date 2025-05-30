import { Domain } from '@nucypher/shared';

import { SignResult, SigningOptions, UserOperation } from './types';
import { aggregateSignatures, verifyThreshold } from './utils';


// Core signing functions
export async function sign191(
  payload: Uint8Array | string,
  cohortId: number,
  domain: Domain,
  options: SigningOptions = { optimistic: true, returnAggregated: true }
): Promise<SignResult> {
  throw new Error("Not implemented");
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
  throw new Error("Not implemented");
}