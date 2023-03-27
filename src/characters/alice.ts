import {
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Configuration } from '../config';
import { Keyring } from '../keyring';
import {
  BlockchainPolicy,
  BlockchainPolicyParameters,
  EnactedPolicy,
  PreEnactedPolicy,
} from '../policies/policy';
import { ChecksumAddress } from '../types';

import { RemoteBob } from './bob';
import { Porter } from './porter';

export class Alice {
  private readonly porter: Porter;
  private readonly keyring: Keyring;

  private constructor(
    config: Configuration,
    secretKey: SecretKey,
    public readonly web3Provider: ethers.providers.Web3Provider
  ) {
    this.porter = new Porter(config.porterUri);
    this.keyring = new Keyring(secretKey);
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public get signer(): Signer {
    return this.keyring.signer;
  }

  public static fromSecretKey(
    config: Configuration,
    secretKey: SecretKey,
    web3Provider: ethers.providers.Web3Provider
  ): Alice {
    return new Alice(config, secretKey, web3Provider);
  }

  public getPolicyEncryptingKeyFromLabel(label: string): PublicKey {
    return this.keyring.getPublicKeyFromLabel(label);
  }

  public async grant(
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[]
  ): Promise<EnactedPolicy> {
    const ursulas = await this.porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas
    );
    const policy = await this.createPolicy(policyParameters);
    return await policy.enact(ursulas);
  }

  public async generatePreEnactedPolicy(
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: readonly ChecksumAddress[],
    excludeUrsulas?: readonly ChecksumAddress[]
  ): Promise<PreEnactedPolicy> {
    const ursulas = await this.porter.getUrsulas(
      policyParameters.shares,
      excludeUrsulas,
      includeUrsulas
    );
    const policy = await this.createPolicy(policyParameters);
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
    rawParameters: BlockchainPolicyParameters
  ): Promise<BlockchainPolicy> {
    const { bob, label, threshold, shares, startDate, endDate } =
      await this.validatePolicyParameters(rawParameters);
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

    const blockNumber = await this.web3Provider.getBlockNumber();
    const block = await this.web3Provider.getBlock(blockNumber);
    const blockTime = new Date(block.timestamp * 1000);
    if (endDate < blockTime) {
      throw new Error(
        `End date must be in the future, ${endDate} is earlier than block time ${blockTime}).`
      );
    }
    return { ...rawParams, startDate };
  }
}
