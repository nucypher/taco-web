import { ThresholdMessageKit } from '@nucypher/nucypher-core';
import { type Account, Domain, type PublicClient } from '@nucypher/shared';
import { ethers } from 'ethers';

import { Condition } from './conditions/condition';
import { ConditionContext } from './conditions/context';
import { decrypt as ethersDecrypt, encrypt as ethersEncrypt } from './taco';
import { decrypt as viemDecrypt, encrypt as viemEncrypt } from './viem-taco';

// Function overloads for encrypt
export function encrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit>;

export function encrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit>;

// Implementation that routes to the appropriate function
export async function encrypt(
  providerOrClient: ethers.providers.Provider | PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  signerOrAccount: ethers.Signer | Account,
): Promise<ThresholdMessageKit> {
  // Type guard to determine if we're using viem or ethers
  if (isViemClient(providerOrClient)) {
    console.debug(
      'viem encrypt function will be used as viem client has been detected',
    );
    return viemEncrypt(
      providerOrClient as PublicClient,
      domain,
      message,
      condition,
      ritualId,
      signerOrAccount as Account,
    );
  } else {
    console.debug(
      'ethers encrypt function will be used as viem client has not been detected',
    );
    return ethersEncrypt(
      providerOrClient as ethers.providers.Provider,
      domain,
      message,
      condition,
      ritualId,
      signerOrAccount as ethers.Signer,
    );
  }
}

// Function overloads for decrypt
export function decrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

export function decrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

// Implementation that routes to the appropriate function
export async function decrypt(
  providerOrClient: ethers.providers.Provider | PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array> {
  // Type guard to determine if we're using viem or ethers
  if (isViemClient(providerOrClient)) {
    console.debug(
      'viem decrypt function will be used as viem client has been detected',
    );
    return viemDecrypt(
      providerOrClient as PublicClient,
      domain,
      messageKit,
      context,
      porterUris,
    );
  } else {
    console.debug(
      'ethers decrypt function will be used as viem client has not been detected',
    );
    return ethersDecrypt(
      providerOrClient as ethers.providers.Provider,
      domain,
      messageKit,
      context,
      porterUris,
    );
  }
}

// Type guard to determine if the client is a viem PublicClient
function isViemClient(
  client: ethers.providers.Provider | PublicClient,
): client is PublicClient {
  const hasViemProperties = 'chain' in client;
  const hasViemMethods =
    typeof (client as { getChainId: () => Promise<number> }).getChainId ===
    'function';
  const isNotEthersProvider = !(
    client instanceof ethers.providers.BaseProvider
  );

  return isNotEthersProvider && (hasViemProperties || hasViemMethods);
}
