import {
  convertUserOperationToPython,
  Domain,
  getPorterUris,
  PorterClient,
  SigningCoordinatorAgent,
  SignResult,
  toBase64,
  UserOperation,
  UserOperationSignatureRequest,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { ConditionExpression } from './conditions/condition-expr';
import { ConditionContext } from './conditions/context';

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
  console.log({ signers });

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
  const result = await porter.signUserOp(signingRequests, threshold);

  return result;
}

export async function setSigningCohortConditions(
  conditions: ConditionExpression,
  provider: ethers.providers.JsonRpcProvider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  signer: ethers.Signer,
): Promise<ethers.ContractTransaction> {
  // Convert ConditionContext to CoreConditions JSON
  const conditionsJson = conditions.toJson();

  // Set conditions on the SigningCoordinator contract
  return await SigningCoordinatorAgent.setSigningCohortConditions(
    provider,
    domain,
    cohortId,
    chainId,
    conditionsJson,
    signer,
  );
}
