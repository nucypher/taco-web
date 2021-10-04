import { Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { PublicKey, Signer, VerifiedKeyFrag } from 'umbral-pre';

import { StakingEscrowAgent } from '../agents/staking-escrow';
import { NucypherKeyring } from '../crypto/keyring';
import {
  DelegatingPower,
  SigningPower,
  TransactingPower,
} from '../crypto/powers';
import { MessageKit } from '../kits/message';
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

  public encryptFor(recipientKey: PublicKey, payload: Uint8Array): MessageKit {
    return MessageKit.author(recipientKey, payload, this.signer);
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
    policyParameters: BlockchainPolicyParameters
  ): Promise<BlockchainPolicy> {
    const { label, threshold, shares, bob } = policyParameters;
    const { delegatingKey, verifiedKFrags } = this.generateKFrags(
      policyParameters.bob,
      label,
      threshold,
      shares
    );
    const { expiration, value } = await this.generatePolicyParameters(
      policyParameters
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
    policyParams: BlockchainPolicyParameters
  ): Promise<BlockchainPolicyParameters> {
    const { shares, paymentPeriods, expiration, value, rate } = policyParams;
    if (!paymentPeriods && !expiration) {
      throw new Error(
        "Policy end time must be specified as 'expiration' or 'paymentPeriods', got neither"
      );
    }

    if (expiration && expiration < new Date(Date.now())) {
      throw new Error(`Expiration must be in the future: ${expiration}).`);
    }

    const blockNumber =
      await this.transactingPower.signer.provider.getBlockNumber();
    const block = await this.transactingPower.signer.provider.getBlock(
      blockNumber
    );
    const blockTime = new Date(block.timestamp * 1000);
    if (expiration && expiration < blockTime) {
      throw new Error(
        `Expiration must be in the future (${expiration} is earlier than block time ${blockTime}).`
      );
    }

    const secondsPerPeriod = await StakingEscrowAgent.getSecondsPerPeriod(
      this.transactingPower.signer.provider
    );
    if (paymentPeriods) {
      const currentPeriod = await StakingEscrowAgent.getCurrentPeriod(
        this.transactingPower.signer.provider
      );
      const newExpiration = dateAtPeriod(
        currentPeriod + paymentPeriods,
        secondsPerPeriod,
        true
      );
      //  Get the last second of the target period
      policyParams.expiration = new Date(newExpiration.getTime() - 1000);
    } else {
      // +1 will equal to number of all included periods
      policyParams.paymentPeriods =
        calculatePeriodDuration(expiration!, secondsPerPeriod) + 1;
    }

    const blockchainParams = BlockchainPolicy.generatePolicyParameters(
      shares,
      paymentPeriods!,
      value,
      rate
    );

    // These values may have been recalculated in this block time.
    const policyEndTime = { paymentPeriods, expiration };
    // TODO: Can we do that more elegantly?
    return mergeWithoutUndefined(
      mergeWithoutUndefined(policyParams, blockchainParams),
      policyEndTime
    ) as BlockchainPolicyParameters;
  }
}
