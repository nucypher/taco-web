import { ethers } from 'ethers';
import { PublicKey, Signer, VerifiedKeyFrag } from 'umbral-pre';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { StakingEscrowAgent } from '../agents/staking-escrow';
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
} from '../policies/policy';
import { ChecksumAddress, Configuration } from '../types';
import {
  calculatePeriodDuration,
  dateAtPeriod,
  mergeWithoutUndefined,
} from '../utils';

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

  public static fromSecretKeyBytes(
    config: Configuration,
    secretKeyBytes: Uint8Array,
    web3Provider: ethers.providers.Web3Provider
  ): Alice {
    const keyring = new NucypherKeyring(secretKeyBytes);
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
      policyParameters.paymentPeriods,
      excludeUrsulas,
      includeUrsulas
    );
    const policy = await this.createPolicy(policyParameters);
    return await policy.enact(ursulas);
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
    const { bob, label, threshold, shares, expiration, value } =
      await this.generatePolicyParameters(rawParameters);
    const { delegatingKey, verifiedKFrags } = this.generateKFrags(
      bob,
      label,
      threshold,
      shares
    );
    return new BlockchainPolicy(
      this,
      label,
      expiration!,
      bob,
      verifiedKFrags,
      delegatingKey,
      threshold,
      shares,
      value!
    );
  }

  private async generatePolicyParameters(
    rawParams: BlockchainPolicyParameters
  ): Promise<BlockchainPolicyParameters> {
    // Validate raw parameters
    if (!rawParams.paymentPeriods && !rawParams.expiration) {
      throw new Error(
        "Policy end time must be specified as 'expiration' or 'paymentPeriods', got neither."
      );
    }

    if (rawParams.threshold > rawParams.shares) {
      throw new Error('Threshold may not be greater than number of shares.');
    }

    if (rawParams.expiration && rawParams.expiration < new Date(Date.now())) {
      throw new Error(
        `Expiration must be in the future: ${rawParams.expiration}).`
      );
    }

    const blockNumber = await this.transactingPower.provider.getBlockNumber();
    const block = await this.transactingPower.provider.getBlock(blockNumber);
    const blockTime = new Date(block.timestamp * 1000);
    if (rawParams.expiration && rawParams.expiration < blockTime) {
      throw new Error(
        `Expiration must be in the future (${rawParams.expiration} is earlier than block time ${blockTime}).`
      );
    }

    // Generate new parameters when needed
    const secondsPerPeriod = await StakingEscrowAgent.getSecondsPerPeriod(
      this.transactingPower.provider
    );
    if (rawParams.paymentPeriods) {
      const currentPeriod = await StakingEscrowAgent.getCurrentPeriod(
        this.transactingPower.provider
      );
      const newExpiration = dateAtPeriod(
        currentPeriod + rawParams.paymentPeriods,
        secondsPerPeriod,
        true
      );
      //  Get the last second of the target period
      rawParams.expiration = new Date(newExpiration.getTime() - 1000);
    } else {
      // +1 will equal to number of all included periods
      rawParams.paymentPeriods =
        calculatePeriodDuration(rawParams.expiration!, secondsPerPeriod) + 1;
    }
    rawParams.value = BlockchainPolicy.calculateValue(
      rawParams.shares,
      rawParams.paymentPeriods!,
      rawParams.value,
      rawParams.rate
    );

    // These values may have been recalculated in this block time.
    const policyEndTime = {
      paymentPeriods: rawParams.paymentPeriods,
      expiration: rawParams.expiration,
    };
    return mergeWithoutUndefined(
      rawParams,
      policyEndTime
    ) as BlockchainPolicyParameters;
  }

  public async revoke(policyId: Uint8Array) {
    const policyDisabled = await PolicyManagerAgent.policyDisabled(
      this.transactingPower.provider,
      policyId
    );
    if (!policyDisabled) {
      await PolicyManagerAgent.revokePolicy(this.transactingPower, policyId);
    }
  }
}
