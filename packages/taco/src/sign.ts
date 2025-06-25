import {
  convertUserOperationToPython,
  Domain,
  getPorterUris,
  PorterClient,
  SigningCoordinatorAgent,
  SigningOptions,
  SignResult,
  toBase64,
  UserOperation,
  UserOperationSignatureRequest,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { ConditionContext } from './conditions/context';

export async function signUserOp(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  userOp: UserOperation,
  aaVersion: '0.8.0' | string,
  options: SigningOptions = { optimistic: true, returnAggregated: true },
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
  console.log({ signers });
  
  const threshold = await SigningCoordinatorAgent.getThreshold(
    provider,
    domain,
    cohortId,
  );

  const pythonUserOp = convertUserOperationToPython(userOp);
  const userOpString = JSON.stringify(pythonUserOp, Object.keys(pythonUserOp).sort());
  
  const signingRequest = new UserOperationSignatureRequest(
    userOpString,
    aaVersion,
    cohortId,
    chainId,
    context || {},
    "userop"
  );

  const signingRequests: Record<string, string> = Object.fromEntries(
    signers.map((signer) => [
      signer.provider, 
      toBase64(signingRequest.toBytes())
    ]),
  );

  // Build signing request for the user operation
  const result = await porter.signUserOp(signingRequests, threshold, options);

  return result;
}
