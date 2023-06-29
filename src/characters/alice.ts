import {
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Keyring } from '../keyring';
import {
  BlockchainPolicy,
  BlockchainPolicyParameters,
  EnactedPolicy,
  PreEnactedPolicy,
} from '../policies/policy';
import { PorterClient } from '../porter';
import { ChecksumAddress } from '../types';

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
    web3Provider: ethers.providers.Web3Provider,
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
    const policy = await this.createPolicy(web3Provider, policyParameters);
    return await policy.enact(web3Provider, ursulas);
  }

  public async generatePreEnactedPolicy(
    web3Provider: ethers.providers.Web3Provider,
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
    const policy = await this.createPolicy(web3Provider, policyParameters);
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
    web3Provider: ethers.providers.Web3Provider,
    rawParameters: BlockchainPolicyParameters
  ): Promise<BlockchainPolicy> {
    const { bob, label, threshold, shares, startDate, endDate } =
      await this.validatePolicyParameters(web3Provider, rawParameters);
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
    web3Provider: ethers.providers.Web3Provider,
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

    const blockNumber = await web3Provider.getBlockNumber();
    const block = await web3Provider.getBlock(blockNumber);
    const blockTime = new Date(block.timestamp * 1000);
    if (endDate < blockTime) {
      throw new Error(
        `End date must be in the future, ${endDate} is earlier than block time ${blockTime}).`
      );
    }
    return { ...rawParams, startDate };
  }
}
