import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import { type Account, Domain, type PublicClient } from '@nucypher/shared';
import { ethers } from 'ethers';

import { Condition } from './conditions/condition';
import { ConditionContext } from './conditions/context';
import {
  decrypt as ethersDecrypt,
  encrypt as ethersEncrypt,
  encryptWithPublicKey as ethersEncryptWithPublicKey,
} from './taco';
import {
  decrypt as viemDecrypt,
  encrypt as viemEncrypt,
  encryptWithPublicKey as viemEncryptWithPublicKey,
} from './viem-taco';

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
  // Validate that provider and signer types are compatible
  validateProviderSignerCompatibility(providerOrClient, signerOrAccount);

  // Type guard to determine if we're using viem or ethers
  if (isViemClient(providerOrClient)) {
    return viemEncrypt(
      providerOrClient as PublicClient,
      domain,
      message,
      condition,
      ritualId,
      signerOrAccount as Account,
    );
  } else {
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

// Function overloads for encryptWithPublicKey
export function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit>;

export function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit>;

// Implementation that routes to the appropriate function
export async function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  signerOrAccount: ethers.Signer | Account,
): Promise<ThresholdMessageKit> {
  // Type guard to determine if we're using viem or ethers
  if (isViemAccount(signerOrAccount)) {
    return viemEncryptWithPublicKey(
      message,
      condition,
      dkgPublicKey,
      signerOrAccount as Account,
    );
  } else {
    return ethersEncryptWithPublicKey(
      message,
      condition,
      dkgPublicKey,
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
    return viemDecrypt(
      providerOrClient as PublicClient,
      domain,
      messageKit,
      context,
      porterUris,
    );
  } else {
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

// Type guard to determine if the signer is a viem Account
function isViemAccount(signer: ethers.Signer | Account): signer is Account {
  // Check for viem Account properties
  const hasViemAccountProperties =
    'address' in signer &&
    typeof (signer as { address: string }).address === 'string' &&
    !('provider' in signer); // ethers.Signer has provider property

  // Check if it's not an ethers.Signer
  const isNotEthersSigner = !(signer instanceof ethers.Signer);

  return isNotEthersSigner && hasViemAccountProperties;
}

// Validate that provider and signer types are compatible
function validateProviderSignerCompatibility(
  providerOrClient: ethers.providers.Provider | PublicClient,
  signerOrAccount: ethers.Signer | Account,
): void {
  const isViemProvider = isViemClient(providerOrClient);
  const isViemSigner = isViemAccount(signerOrAccount);

  if (isViemProvider && !isViemSigner) {
    throw new Error(
      'Type mismatch: viem PublicClient provided but ethers.Signer detected. ' +
        'When using viem, please provide a viem Account. ' +
        'Use either: (ethers.Provider + ethers.Signer) or (viem.PublicClient + viem.Account)',
    );
  }

  if (!isViemProvider && isViemSigner) {
    throw new Error(
      'Type mismatch: ethers.Provider provided but viem Account detected. ' +
        'When using ethers, please provide an ethers.Signer. ' +
        'Use either: (ethers.Provider + ethers.Signer) or (viem.PublicClient + viem.Account)',
    );
  }
}
