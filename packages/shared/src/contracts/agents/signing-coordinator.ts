import { getContract } from '@nucypher/nucypher-contracts';
import { SessionStaticKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Domain } from '../../porter';
import { fromHexString } from '../../utils';
import { SigningCoordinator__factory } from '../ethers-typechain';
import { SigningCoordinator } from '../ethers-typechain/SigningCoordinator';

export type SignerInfo = {
  provider: string;
  signerAddress: string;
  signingRequestStaticKey: SessionStaticKey;
};

export class SigningCoordinatorAgent {
  private static readonly CACHE_TTL_MS = 10_000;
  private static cache = new Map<string, { data: unknown; expiry: number }>();

  private static getCached<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return undefined;
  }

  private static setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiry: Date.now() + this.CACHE_TTL_MS });
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  public static async getParticipants(
    provider: ethers.providers.Provider,
    domain: Domain,
    cohortId: number,
  ): Promise<SignerInfo[]> {
    const cacheKey = `participants:${domain}:${cohortId}`;
    const cached = this.getCached<SignerInfo[]>(cacheKey);
    if (cached !== undefined) return cached;

    const coordinator = await this.connectReadOnly(provider, domain);
    const participants = await coordinator.getSigners(cohortId);

    const result = participants.map(
      (
        participant: SigningCoordinator.SigningCohortParticipantStructOutput,
      ) => {
        return {
          provider: participant.provider,
          signerAddress: participant.signerAddress,
          signingRequestStaticKey: SessionStaticKey.fromBytes(
            fromHexString(participant.signingRequestStaticKey),
          ),
        };
      },
    );

    this.setCache(cacheKey, result);
    return result;
  }

  public static async getThreshold(
    provider: ethers.providers.Provider,
    domain: Domain,
    cohortId: number,
  ): Promise<number> {
    const cacheKey = `threshold:${domain}:${cohortId}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached !== undefined) return cached;

    const coordinator = await this.connectReadOnly(provider, domain);
    const cohort = await coordinator.signingCohorts(cohortId);
    const result = cohort.threshold;

    this.setCache(cacheKey, result);
    return result;
  }

  public static async getSigningCohortConditions(
    provider: ethers.providers.Provider,
    domain: Domain,
    cohortId: number,
    chainId: number,
  ): Promise<string> {
    const coordinator = await this.connectReadOnly(provider, domain);
    const cohortCondition = await coordinator.getSigningCohortConditions(
      cohortId,
      chainId,
    );
    return cohortCondition;
  }

  public static async setSigningCohortConditions(
    provider: ethers.providers.Provider,
    domain: Domain,
    cohortId: number,
    chainId: number,
    conditions: Uint8Array,
    signer: ethers.Signer,
  ): Promise<ethers.ContractTransaction> {
    const coordinator = await this.connect(provider, domain, signer);
    return await coordinator.setSigningCohortConditions(
      cohortId,
      chainId,
      conditions,
    );
  }

  public static async getSigningCoordinatorChild(
    provider: ethers.providers.Provider,
    domain: Domain,
    chainId: number,
  ): Promise<string> {
    const coordinator = await this.connectReadOnly(provider, domain);
    return await coordinator.getSigningCoordinatorChild(chainId);
  }

  private static async connectReadOnly(
    provider: ethers.providers.Provider,
    domain: Domain,
  ) {
    return await this.connect(provider, domain);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer?: ethers.Signer,
  ): Promise<SigningCoordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(
      domain,
      network.chainId,
      'SigningCoordinator',
    );
    return SigningCoordinator__factory.connect(
      contractAddress,
      signer ?? provider,
    );
  }
}
