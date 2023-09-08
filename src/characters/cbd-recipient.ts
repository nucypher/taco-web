import {
  combineDecryptionSharesSimple,
  Context,
  DecryptionShareSimple,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  FerveoVariant,
  SessionSharedSecret,
  SessionStaticSecret,
  ThresholdDecryptionRequest,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgParticipant } from '../agents/coordinator';
import { ConditionContext } from '../conditions';
import { DkgRitual } from '../dkg';
import { PorterClient } from '../porter';
import { fromJSON, objectEquals, toJSON } from '../utils';

export type ThresholdDecrypterJSON = {
  porterUri: string;
  ritualId: number;
  threshold: number;
};

export class ThresholdDecrypter {
  private constructor(
    private readonly porter: PorterClient,
    private readonly ritualId: number,
    private readonly threshold: number
  ) {}

  public static create(porterUri: string, dkgRitual: DkgRitual) {
    return new ThresholdDecrypter(
      new PorterClient(porterUri),
      dkgRitual.id,
      dkgRitual.dkgParams.threshold
    );
  }

  // Retrieve and decrypt ciphertext using provider and condition expression
  public async retrieveAndDecrypt(
    provider: ethers.providers.Provider,
    thresholdMessageKit: ThresholdMessageKit,
    signer?: ethers.Signer
  ): Promise<Uint8Array> {
    const decryptionShares = await this.retrieve(
      provider,
      thresholdMessageKit,
      signer
    );
    const sharedSecret = combineDecryptionSharesSimple(decryptionShares);
    return thresholdMessageKit.decryptWithSharedSecret(sharedSecret);
  }

  // Retrieve decryption shares
  public async retrieve(
    provider: ethers.providers.Provider,
    thresholdMessageKit: ThresholdMessageKit,
    signer?: ethers.Signer
  ): Promise<DecryptionShareSimple[]> {
    const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
      provider,
      this.ritualId
    );
    const wasmContext = await ConditionContext.fromConditions(
      provider,
      thresholdMessageKit.acp.conditions,
      signer
    ).toWASMContext();
    const { sharedSecrets, encryptedRequests } =
      await this.makeDecryptionRequests(
        this.ritualId,
        wasmContext,
        dkgParticipants,
        thresholdMessageKit
      );

    const { encryptedResponses, errors } = await this.porter.cbdDecrypt(
      encryptedRequests,
      this.threshold
    );
    if (Object.keys(encryptedResponses).length < this.threshold) {
      throw new Error(
        `Threshold of responses not met; CBD decryption failed with errors: ${JSON.stringify(
          errors
        )}`
      );
    }

    return this.makeDecryptionShares(
      encryptedResponses,
      sharedSecrets,
      this.ritualId
    );
  }

  private makeDecryptionShares(
    encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>,
    sessionSharedSecret: Record<string, SessionSharedSecret>,
    expectedRitualId: number
  ) {
    const decryptedResponses = Object.entries(encryptedResponses).map(
      ([ursula, response]) => response.decrypt(sessionSharedSecret[ursula])
    );

    const ritualIds = decryptedResponses.map(({ ritualId }) => ritualId);
    if (ritualIds.some((ritualId) => ritualId !== expectedRitualId)) {
      throw new Error(
        `Ritual id mismatch. Expected ${expectedRitualId}, got ${ritualIds}`
      );
    }

    return decryptedResponses.map(({ decryptionShare }) =>
      DecryptionShareSimple.fromBytes(decryptionShare)
    );
  }

  private async makeDecryptionRequests(
    ritualId: number,
    wasmContext: Context,
    dkgParticipants: Array<DkgParticipant>,
    thresholdMessageKit: ThresholdMessageKit
  ): Promise<{
    sharedSecrets: Record<string, SessionSharedSecret>;
    encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>;
  }> {
    const decryptionRequest = new ThresholdDecryptionRequest(
      ritualId,
      FerveoVariant.simple,
      thresholdMessageKit.ciphertextHeader,
      thresholdMessageKit.acp,
      wasmContext
    );

    const ephemeralSessionKey = this.makeSessionKey();

    // Compute shared secrets for each participant
    const sharedSecrets: Record<string, SessionSharedSecret> =
      Object.fromEntries(
        dkgParticipants.map(({ provider, decryptionRequestStaticKey }) => {
          const sharedSecret = ephemeralSessionKey.deriveSharedSecret(
            decryptionRequestStaticKey
          );
          return [provider, sharedSecret];
        })
      );

    // Create encrypted requests for each participant
    const encryptedRequests: Record<
      string,
      EncryptedThresholdDecryptionRequest
    > = Object.fromEntries(
      Object.entries(sharedSecrets).map(([provider, sessionSharedSecret]) => {
        const encryptedRequest = decryptionRequest.encrypt(
          sessionSharedSecret,
          ephemeralSessionKey.publicKey()
        );
        return [provider, encryptedRequest];
      })
    );

    return { sharedSecrets, encryptedRequests };
  }

  private makeSessionKey() {
    // Moving to a separate function to make it easier to mock
    return SessionStaticSecret.random();
  }

  public toObj(): ThresholdDecrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      ritualId: this.ritualId,
      threshold: this.threshold,
    };
  }

  public toJSON(): string {
    return toJSON(this.toObj());
  }

  public static fromObj({
    porterUri,
    ritualId,
    threshold,
  }: ThresholdDecrypterJSON) {
    return new ThresholdDecrypter(
      new PorterClient(porterUri),
      ritualId,
      threshold
    );
  }

  public static fromJSON(json: string) {
    return ThresholdDecrypter.fromObj(fromJSON(json));
  }

  public equals(other: ThresholdDecrypter): boolean {
    return objectEquals(this.toObj(), other.toObj());
  }
}
