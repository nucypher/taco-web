import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import {
  Account,
  type Domain,
  isViemAccount,
  isViemClient,
  PublicClient,
  validateProviderSignerCompatibility,
} from '@nucypher/shared';
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
  if (isViemClient(providerOrClient) && isViemAccount(signerOrAccount)) {
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
