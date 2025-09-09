import { ethers } from 'ethers';

import { Account, PublicClient } from './viem-types';

export type ChecksumAddress = `0x${string}`;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;

export type ProviderLike = ethers.providers.Provider | PublicClient;
export type SignerLike = ethers.Signer | Account;
