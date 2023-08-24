import {
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { PublicClient, WalletClient } from 'viem';
import { getBlock, getBlockNumber } from 'viem/actions';

import { Keyring } from '../keyring';
import {
  BlockchainPolicy,
  BlockchainPolicyParameters,
  EnactedPolicy,
  PreEnactedPolicy,
} from '../policies/policy';
import { PorterClient } from '../porter';
import { ChecksumAddress } from '../types';
import { toPublicClient } from '../viem';

import { RemoteBob } from './bob';

export class Alice {
  private readonly keyring: Keyring;

  private constructor(secretKey: SecretKey) {
    this.keyring = new Keyring(secretKey);
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public get signer(): Signer {
    return this.keyring.signer;
  }

  public static fromSecretKey(secretKey: SecretKey): Alice {
    return new Alice(secretKey);
  }

  public getPolicyEncryptingKeyFromLabel(label: string): PublicKey {
    return this.keyring.getPublicKeyFromLabel(label);
  }

  public async grant(
    walletClient: WalletClient,
    porterUri: string,
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[]
  ): Promise<EnactedPolicy> {
    const porter = new PorterClient(porterUri);
    const ursulas = await porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas
    );
    const policy = await this.createPolicy(walletClient, policyParameters);
    return await policy.enact(walletClient, ursulas);
  }

  public async generatePreEnactedPolicy(
    walletClient: WalletClient,
    porterUri: string,
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[]
  ): Promise<PreEnactedPolicy> {
    const porter = new PorterClient(porterUri);
    const ursulas = await porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas
    );
    const policy = await this.createPolicy(walletClient, policyParameters);
    return await policy.generatePreEnactedPolicy(ursulas);
  }

  public generateKFrags(
    bob: RemoteBob,
    label: string,
    threshold: number,
    shares: number
  ): {
    readonly delegatingKey: PublicKey;
    readonly verifiedKFrags: readonly VerifiedKeyFrag[];
  } {
    return this.keyring.generateKFrags(
      bob.decryptingKey,
      this.signer,
      label,
      threshold,
      shares
    );
  }

  private async createPolicy(
    walletClient: WalletClient,
    rawParameters: BlockchainPolicyParameters
  ): Promise<BlockchainPolicy> {
    const publicClient = toPublicClient(walletClient);
    const { bob, label, threshold, shares, startDate, endDate } =
      await this.validatePolicyParameters(publicClient, rawParameters);
    const { delegatingKey, verifiedKFrags } = this.generateKFrags(
      bob,
      label,
      threshold,
      shares
    );
    return new BlockchainPolicy(
      this,
      label,
      bob,
      verifiedKFrags,
      delegatingKey,
      threshold,
      shares,
      startDate,
      endDate
    );
  }

  private async validatePolicyParameters(
    publicClient: PublicClient,
    rawParams: BlockchainPolicyParameters
  ): Promise<BlockchainPolicyParameters> {
    const startDate = rawParams.startDate ?? new Date();
    const { endDate, threshold, shares } = rawParams;
    // Validate raw parameters
    if (threshold > shares) {
      throw new Error(
        `Threshold may not be greater than number of shares: ${threshold} > ${shares}`
      );
    }

    if (endDate < new Date(Date.now())) {
      throw new Error(`End date must be in the future: ${endDate}).`);
    }

    if (startDate > endDate) {
      throw new Error(
        `Start date must accur before end date: ${startDate} > ${endDate}).`
      );
    }

    const blockNumber = await getBlockNumber(publicClient);
    const block = await getBlock(publicClient, { blockNumber });
    const blockTime = new Date(Number(block.timestamp) * 1000);
    if (endDate < blockTime) {
      throw new Error(
        `End date must be in the future, ${endDate} is earlier than block time ${blockTime}).`
      );
    }
    return { ...rawParams, startDate };
  }
}
