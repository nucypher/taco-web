import { getContract } from '@nucypher/nucypher-contracts';
import {
  DkgPublicKey,
  SessionStaticKey,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import { BigNumberish } from 'ethers';
import { PublicClient, WalletClient } from 'viem';

import { Domain } from '../../porter';
import { ChecksumAddress } from '../../types';
import { fromHexString } from '../../utils';
import { publicClientToProvider, walletClientToSigner } from '../../viem';
import { DEFAULT_WAIT_N_CONFIRMATIONS } from '../const';
import { Coordinator__factory } from '../ethers-typechain';
import { BLS12381, Coordinator } from '../ethers-typechain/Coordinator';

export interface CoordinatorRitual {
  initiator: string;
  initTimestamp: number;
  endTimestamp: number;
  totalTranscripts: number;
  totalAggregations: number;
  authority: string;
  dkgSize: number;
  threshold: number;
  aggregationMismatch: boolean;
  accessController: string;
  publicKey: BLS12381.G1PointStructOutput;
  aggregatedTranscript: string;
}

export type DkgParticipant = {
  provider: string;
  aggregated: boolean;
  decryptionRequestStaticKey: SessionStaticKey;
};

export enum DkgRitualState {
  NON_INITIATED,
  DKG_AWAITING_TRANSCRIPTS,
  DKG_AWAITING_AGGREGATIONS,
  DKG_TIMEOUT,
  DKG_INVALID,
  ACTIVE,
  EXPIRED,
}

export class DkgCoordinatorAgent {
  public static async getParticipants(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgParticipant[]> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    const participants = await coordinator.getParticipants(ritualId);

    return participants.map((participant) => {
      return {
        provider: participant.provider,
        aggregated: participant.aggregated,
        decryptionRequestStaticKey: SessionStaticKey.fromBytes(
          fromHexString(participant.decryptionRequestStaticKey),
        ),
      };
    });
  }

  public static async initializeRitual(
    walletClient: WalletClient,
    domain: Domain,
    providers: ChecksumAddress[],
    authority: string,
    duration: BigNumberish,
    accessController: string,
  ): Promise<number> {
    const coordinator = await this.connectReadWrite(walletClient, domain);
    const tx = await coordinator.initiateRitual(
      providers,
      authority,
      duration,
      accessController,
    );
    const txReceipt = await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
    const [ritualStartEvent] = txReceipt.events ?? [];
    if (!ritualStartEvent) {
      throw new Error('Ritual start event not found');
    }
    return ritualStartEvent.args?.ritualId;
  }

  public static async getRitual(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
  ): Promise<CoordinatorRitual> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    return await coordinator.rituals(ritualId);
  }

  public static async getRitualState(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgRitualState> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    return await coordinator.getRitualState(ritualId);
  }

  public static async onRitualEndEvent(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
    callback: (successful: boolean) => void,
  ): Promise<void> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    // We leave `initiator` undefined because we don't care who the initiator is
    // We leave `successful` undefined because we don't care if the ritual was successful
    const eventFilter = coordinator.filters.EndRitual(ritualId, undefined);
    coordinator.once(eventFilter, (_ritualId, successful) => {
      callback(successful);
    });
  }

  public static async getRitualIdFromPublicKey(
    publicClient: PublicClient,
    domain: Domain,
    dkgPublicKey: DkgPublicKey,
  ): Promise<number> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    const dkgPublicKeyBytes = dkgPublicKey.toBytes();
    const pointStruct: BLS12381.G1PointStruct = {
      word0: dkgPublicKeyBytes.slice(0, 32),
      word1: dkgPublicKeyBytes.slice(32, 48),
    };
    return await coordinator.getRitualIdFromPublicKey(pointStruct);
  }

  public static async isEncryptionAuthorized(
    publicClient: PublicClient,
    domain: Domain,
    ritualId: number,
    thresholdMessageKit: ThresholdMessageKit,
  ): Promise<boolean> {
    const coordinator = await this.connectReadOnly(publicClient, domain);
    return await coordinator.isEncryptionAuthorized(
      ritualId,
      thresholdMessageKit.acp.authorization,
      thresholdMessageKit.ciphertextHeader.toBytes(),
    );
  }

  private static async connectReadOnly(
    publicClient: PublicClient,
    domain: Domain,
  ): Promise<Coordinator> {
    const chainId = await publicClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'Coordinator');
    return Coordinator__factory.connect(
      contractAddress,
      publicClientToProvider(publicClient),
    );
  }

  private static async connectReadWrite(
    walletClient: WalletClient,
    domain: Domain,
  ): Promise<Coordinator> {
    const chainId = await walletClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'Coordinator');
    return Coordinator__factory.connect(
      contractAddress,
      walletClientToSigner(walletClient),
    );
  }
}
