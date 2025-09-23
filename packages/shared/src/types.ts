import { ethers } from 'ethers';

import { PublicClient, SignerAccount } from './viem/types';

export type ChecksumAddress = `0x${string}`;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;

export type ProviderLike = ethers.providers.Provider | PublicClient;

/**
 * Signer-like union for TACo operations.
 *
 * Accepts either ethers Signer or viem SignerAccount (LocalAccount or WalletClient)
 */
export type SignerLike = ethers.Signer | SignerAccount;
