import {
  Domain,
  getPorterUris,
  PorterClient,
  SigningCoordinatorAgent,
  SigningOptions,
  SignResult,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { ConditionContext } from './conditions/context';
import { UserOperation } from './types';

export async function signUserOp(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  userOp: UserOperation,
  aaVersion: 'mdt' | '0.8.0' | string,
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
  const threshold = await SigningCoordinatorAgent.getThreshold(
    provider,
    domain,
    cohortId,
  );

  // Convert UserOperation to sorted JSON string (matching Python: json.dumps(self.to_dict(), sort_keys=True))
  const userOpString = JSON.stringify(userOp, Object.keys(userOp).sort());
  
  const signingRequest: any = {
    user_op: userOpString,
    aa_version: aaVersion,
    cohort_id: cohortId,
    chain_id: chainId,
    context: context || {},
    signature_type: aaVersion,
  };

  const signingRequests: Record<string, string> = Object.fromEntries(
    signers.map((signer) => [
      signer.operator, 
      btoa(JSON.stringify(signingRequest))
    ]),
  );

  // Build signing request for the user operation
  const result = await porter.signUserOp(signingRequests, threshold, options);

  return result;
}
