import {
  DkgPublicKey,
  SessionStaticKey,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import { BigNumberish, ethers } from 'ethers';

import { Domain } from '../../porter';
import { ChecksumAddress } from '../../types';
import { fromHexString } from '../../utils';
import { Coordinator__factory } from '../ethers-typechain';
import { BLS12381, Coordinator } from '../ethers-typechain/Coordinator';
import { DEFAULT_WAIT_N_CONFIRMATIONS, getContract } from '../registry';

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
  AWAITING_TRANSCRIPTS,
  AWAITING_AGGREGATIONS,
  TIMEOUT,
  INVALID,
  FINALIZED,
}

export class DkgCoordinatorAgent {
  public static async getParticipants(
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgParticipant[]> {
    const coordinator = await this.connectReadOnly(provider, domain);
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
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    domain: Domain,
    providers: ChecksumAddress[],
    authority: string,
    duration: BigNumberish,
    accessController: string,
  ): Promise<number> {
    const coordinator = await this.connectReadWrite(provider, domain, signer);
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
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
  ): Promise<CoordinatorRitual> {
    const coordinator = await this.connectReadOnly(provider, domain);
    return coordinator.rituals(ritualId);
  }

  public static async getRitualState(
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
  ): Promise<DkgRitualState> {
    const coordinator = await this.connectReadOnly(provider, domain);
    return await coordinator.getRitualState(ritualId);
  }

  public static async onRitualEndEvent(
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
    callback: (successful: boolean) => void,
  ): Promise<void> {
    const coordinator = await this.connectReadOnly(provider, domain);
    // We leave `initiator` undefined because we don't care who the initiator is
    // We leave `successful` undefined because we don't care if the ritual was successful
    const eventFilter = coordinator.filters.EndRitual(ritualId, undefined);
    coordinator.once(eventFilter, (_ritualId, successful) => {
      callback(successful);
    });
  }

  public static async getRitualIdFromPublicKey(
    provider: ethers.providers.Provider,
    domain: Domain,
    dkgPublicKey: DkgPublicKey,
  ): Promise<number> {
    const coordinator = await this.connectReadOnly(provider, domain);
    const dkgPublicKeyBytes = dkgPublicKey.toBytes();
    const pointStruct: BLS12381.G1PointStruct = {
      word0: dkgPublicKeyBytes.slice(0, 32),
      word1: dkgPublicKeyBytes.slice(32, 48),
    };
    return await coordinator.getRitualIdFromPublicKey(pointStruct);
  }

  public static async isEncryptionAuthorized(
    provider: ethers.providers.Provider,
    domain: Domain,
    ritualId: number,
    thresholdMessageKit: ThresholdMessageKit,
  ): Promise<boolean> {
    const coordinator = await this.connectReadOnly(provider, domain);
    return await coordinator.isEncryptionAuthorized(
      ritualId,
      thresholdMessageKit.acp.authorization,
      thresholdMessageKit.ciphertextHeader.toBytes(),
    );
  }

  private static async connectReadOnly(
    provider: ethers.providers.Provider,
    domain: Domain,
  ) {
    return await this.connect(provider, domain);
  }

  private static async connectReadWrite(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer: ethers.Signer,
  ) {
    return await this.connect(provider, domain, signer);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer?: ethers.Signer,
  ): Promise<Coordinator> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(domain, network.chainId, 'Coordinator');
    return Coordinator__factory.connect(contractAddress, signer ?? provider);
  }
}
