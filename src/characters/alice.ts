import {
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { NucypherKeyring } from '../crypto/keyring';
import {
  DelegatingPower,
  SigningPower,
  TransactingPower,
} from '../crypto/powers';
import {
  BlockchainPolicy,
  BlockchainPolicyParameters,
  EnactedPolicy,
  PreEnactedPolicy,
} from '../policies/policy';
import { ChecksumAddress, Configuration } from '../types';

import { RemoteBob } from './bob';
import { Porter } from './porter';

export class Alice {
  private readonly porter: Porter;
  public readonly transactingPower: TransactingPower;
  private readonly delegatingPower: DelegatingPower;
  private readonly signingPower: SigningPower;

  private constructor(
    config: Configuration,
    signingPower: SigningPower,
    delegatingPower: DelegatingPower,
    transactingPower: TransactingPower
  ) {
    this.porter = new Porter(config.porterUri);
    this.signingPower = signingPower;
    this.delegatingPower = delegatingPower;
    this.transactingPower = transactingPower;
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public get signer(): Signer {
    return this.signingPower.signer;
  }

  public static fromSecretKey(
    config: Configuration,
    secretKey: SecretKey,
    web3Provider: ethers.providers.Web3Provider
  ): Alice {
    const keyring = new NucypherKeyring(secretKey);
    const signingPower = keyring.deriveSigningPower();
    const delegatingPower = keyring.deriveDelegatingPower();
    const transactingPower = TransactingPower.fromWeb3Provider(web3Provider);
    return new Alice(config, signingPower, delegatingPower, transactingPower);
  }

  public getPolicyEncryptingKeyFromLabel(label: string): PublicKey {
    return this.delegatingPower.getPublicKeyFromLabel(label);
  }

  public async grant(
    policyParameters: BlockchainPolicyParameters,
    includeUrsulas?: ChecksumAddress[],
    excludeUrsulas?: ChecksumAddress[]
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
    includeUrsulas?: ChecksumAddress[],
    excludeUrsulas?: ChecksumAddress[]
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
    delegatingKey: PublicKey;
    verifiedKFrags: VerifiedKeyFrag[];
  } {
    return this.delegatingPower.generateKFrags(
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

    const blockNumber = await this.transactingPower.provider.getBlockNumber();
    const block = await this.transactingPower.provider.getBlock(blockNumber);
    const blockTime = new Date(block.timestamp * 1000);
    if (endDate < blockTime) {
      throw new Error(
        `End date must be in the future, ${endDate} is earlier than block time ${blockTime}).`
      );
    }
    return { ...rawParams, startDate };
  }
}
