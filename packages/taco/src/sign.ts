import { Domain, getPorterUris, PorterClient } from '@nucypher/shared';

import { SigningOptions, SignResult, UserOperation } from './types';

export async function signUserOp(
  userOp: UserOperation,
  chainId: number,
  aaVersion: "zerodev:v0.6" | "kernel:v0.7" | "safe:v0.8" | "metamask:v0.6" | string,
  cohortId: number,
  domain: Domain,
  options: SigningOptions = { optimistic: true, returnAggregated: true },
  porterUris?: string[]
): Promise<SignResult> {
  const porterUrisFull: string[] = porterUris
    ? porterUris
    : await getPorterUris(domain);
  const porter = new PorterClient(porterUrisFull);

  const result = await porter.signUserOp(
    userOp,
    chainId,
    aaVersion,
    cohortId,
    options,
  );

  return result;
}