import { ethers } from 'ethers';

import { TACoSigner } from './taco-interfaces';
import { Account, PublicClient } from './viem/types';

export type ChecksumAddress = `0x${string}`;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;

export type ProviderLike = ethers.providers.Provider | PublicClient;

/**
 * Signer-like union for TACo operations.
 *
 * Accepts either:
 * - TACoSigner (minimal TACo signer interface used internally), or
 * - viem Account
 *
 * Note: ethers.Signer is also accepted via TypeScript structural typing
 * because it implements the TACoSigner surface (getAddress, signMessage).
 * Passing an ethers.Signer where a SignerLike is expected will work
 * without additional adapters.
 */
export type SignerLike = TACoSigner | Account;
