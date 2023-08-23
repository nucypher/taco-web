import {
  AccessControlPolicy,
  AuthenticatedData,
  Ciphertext,
  combineDecryptionSharesSimple,
  Context,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  FerveoVariant,
  SessionSharedSecret,
  SessionStaticSecret,
  ThresholdDecryptionRequest,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import { DkgCoordinatorAgent, DkgParticipant } from '../agents/coordinator';
import { ConditionExpression } from '../conditions';
import { DkgClient, DkgRitual } from '../dkg';
import { PorterClient } from '../porter';
import { fromJSON, toBytes, toJSON } from '../utils';

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
    signer: ethers.Signer,
    conditionExpr: ConditionExpression,
    ciphertext: Ciphertext
  ): Promise<Uint8Array> {
    const acp = await this.makeAcp(provider, conditionExpr, ciphertext);

    const decryptionShares = await this.retrieve(
      provider,
      signer,
      conditionExpr,
      ciphertext,
      acp
    );

    const sharedSecret = combineDecryptionSharesSimple(decryptionShares);
    return decryptWithSharedSecret(
      ciphertext,
      conditionExpr.asAad(),
      sharedSecret
    );
  }

  private async makeAcp(
    provider: ethers.providers.Web3Provider,
    conditionExpr: ConditionExpression,
    ciphertext: Ciphertext
  ) {
    const dkgRitual = await DkgClient.getExistingRitual(
      provider,
      this.ritualId
    );
    const authData = new AuthenticatedData(
      dkgRitual.dkgPublicKey,
      conditionExpr.toWASMConditions()
    );

    const headerHash = keccak256(ciphertext.header.toBytes());
    const authorization = await provider.getSigner().signMessage(headerHash);

    return new AccessControlPolicy(authData, toBytes(authorization));
  }

  // Retrieve decryption shares
  public async retrieve(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    conditionExpr: ConditionExpression,
    ciphertext: Ciphertext,
    acp: AccessControlPolicy
  ): Promise<DecryptionShareSimple[]> {
    const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
      provider,
      this.ritualId
    );
    const contextStr = await conditionExpr
      .buildContext(provider, signer)
      .toJson();
    const { sharedSecrets, encryptedRequests } = this.makeDecryptionRequests(
      this.ritualId,
      ciphertext,
      contextStr,
      dkgParticipants,
      acp
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

  private makeDecryptionRequests(
    ritualId: number,
    ciphertext: Ciphertext,
    contextStr: string,
    dkgParticipants: Array<DkgParticipant>,
    acp: AccessControlPolicy
  ): {
    sharedSecrets: Record<string, SessionSharedSecret>;
    encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>;
  } {
    const decryptionRequest = new ThresholdDecryptionRequest(
      ritualId,
      FerveoVariant.simple,
      ciphertext.header,
      acp,
      new Context(contextStr)
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
    return (
      this.porter.porterUrl.toString() === other.porter.porterUrl.toString()
    );
  }
}
