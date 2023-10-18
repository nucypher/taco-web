import {
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ChecksumAddress, Domain, PorterClient } from '@nucypher/shared';
import { ethers } from 'ethers';

import { Keyring } from '../keyring';
import {
  BlockchainPolicy,
  BlockchainPolicyParameters,
  EnactedPolicy,
  PreEnactedPolicy,
} from '../policy';

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
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    domain: Domain,
    porterUri: string,
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[],
  ): Promise<EnactedPolicy> {
    const porter = new PorterClient(porterUri);
    const ursulas = await porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas,
    );
    const policy = await this.createPolicy(provider, policyParameters);
    return await policy.enact(provider, signer, domain, ursulas);
  }

  public async generatePreEnactedPolicy(
    provider: ethers.providers.Provider,
    porterUri: string,
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[],
  ): Promise<PreEnactedPolicy> {
    const porter = new PorterClient(porterUri);
    const ursulas = await porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas,
    );
    const policy = await this.createPolicy(provider, policyParameters);
    return await policy.generatePreEnactedPolicy(ursulas);
  }

  public generateKFrags(
    bob: RemoteBob,
    label: string,
    threshold: number,
    shares: number,
  ): {
    readonly delegatingKey: PublicKey;
    readonly verifiedKFrags: readonly VerifiedKeyFrag[];
  } {
    return this.keyring.generateKFrags(
      bob.decryptingKey,
      this.signer,
      label,
      threshold,
      shares,
    );
  }

  private async createPolicy(
    provider: ethers.providers.Provider,
    rawParameters: BlockchainPolicyParameters,
  ): Promise<BlockchainPolicy> {
    const { bob, label, threshold, shares, startDate, endDate } =
      await this.validatePolicyParameters(provider, rawParameters);
    const { delegatingKey, verifiedKFrags } = this.generateKFrags(
      bob,
      label,
      threshold,
      shares,
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
      endDate,
    );
  }

  private async validatePolicyParameters(
    provider: ethers.providers.Provider,
    rawParams: BlockchainPolicyParameters,
  ): Promise<BlockchainPolicyParameters> {
    const startDate = rawParams.startDate ?? new Date();
    const { endDate, threshold, shares } = rawParams;
    // Validate raw parameters
    if (threshold > shares) {
      throw new Error(
        `Threshold may not be greater than number of shares: ${threshold} > ${shares}`,
      );
    }

    if (endDate < new Date(Date.now())) {
      throw new Error(`End date must be in the future: ${endDate}).`);
    }

    if (startDate > endDate) {
      throw new Error(
        `Start date must accur before end date: ${startDate} > ${endDate}).`,
      );
    }

    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const blockTime = new Date(block.timestamp * 1000);
    if (endDate < blockTime) {
      throw new Error(
        `End date must be in the future, ${endDate} is earlier than block time ${blockTime}).`,
      );
    }
    return { ...rawParams, startDate };
  }
}
