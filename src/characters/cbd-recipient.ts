import {
  Ciphertext,
  Context,
  DecryptionSharePrecomputed,
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

import {
  DkgCoordinatorAgent,
  DkgParticipant,
  DkgRitualState,
} from '../agents/coordinator';
import { ConditionExpression } from '../conditions';
import {
  DkgClient,
  DkgRitual,
  getCombineDecryptionSharesFunction,
  getVariantClass,
} from '../dkg';
import { PorterClient } from '../porter';
import { fromJSON, toJSON } from '../utils';

export type ThresholdDecrypterJSON = {
  porterUri: string;
  ritualId: number;
  threshold: number;
};

export class ThresholdDecrypter {
  // private readonly verifyingKey: Keyring;

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
    provider: ethers.providers.Web3Provider,
    conditionExpr: ConditionExpression,
    variant: FerveoVariant,
    ciphertext: Ciphertext,
    verifyRitual = true
  ): Promise<Uint8Array> {
    const decryptionShares = await this.retrieve(
      provider,
      conditionExpr,
      variant,
      ciphertext,
      verifyRitual
    );

    const combineDecryptionSharesFn =
      getCombineDecryptionSharesFunction(variant);
    const sharedSecret = combineDecryptionSharesFn(decryptionShares);
    return decryptWithSharedSecret(
      ciphertext,
      conditionExpr.asAad(),
      sharedSecret
    );
  }

  // Retrieve decryption shares
  public async retrieve(
    web3Provider: ethers.providers.Web3Provider,
    conditionExpr: ConditionExpression,
    variant: FerveoVariant,
    ciphertext: Ciphertext,
    verifyRitual = true
  ): Promise<DecryptionSharePrecomputed[] | DecryptionShareSimple[]> {
    const ritualState = await DkgCoordinatorAgent.getRitualState(
      web3Provider,
      this.ritualId
    );
    if (ritualState !== DkgRitualState.FINALIZED) {
      throw new Error(
        `Ritual with id ${this.ritualId} is not finalized. Ritual state is ${ritualState}.`
      );
    }

    if (verifyRitual) {
      const isLocallyVerified = await DkgClient.verifyRitual(
        web3Provider,
        this.ritualId
      );
      if (!isLocallyVerified) {
        throw new Error(
          `Ritual with id ${this.ritualId} has failed local verification.`
        );
      }
    }

    const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
      web3Provider,
      this.ritualId
    );
    const contextStr = await conditionExpr.buildContext(web3Provider).toJson();
    const { sharedSecrets, encryptedRequests } = this.makeDecryptionRequests(
      this.ritualId,
      variant,
      ciphertext,
      conditionExpr,
      contextStr,
      dkgParticipants
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
      variant,
      this.ritualId
    );
  }

  private makeDecryptionShares(
    encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>,
    sessionSharedSecret: Record<string, SessionSharedSecret>,
    variant: FerveoVariant,
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

    const decryptionShares = decryptedResponses.map(
      ({ decryptionShare }) => decryptionShare
    );

    const DecryptionShareType = getVariantClass(variant);
    return decryptionShares.map((share) =>
      DecryptionShareType.fromBytes(share)
    );
  }

  private makeDecryptionRequests(
    ritualId: number,
    variant: FerveoVariant,
    ciphertext: Ciphertext,
    conditionExpr: ConditionExpression,
    contextStr: string,
    dkgParticipants: Array<DkgParticipant>
  ): {
    sharedSecrets: Record<string, SessionSharedSecret>;
    encryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>;
  } {
    const decryptionRequest = new ThresholdDecryptionRequest(
      ritualId,
      variant,
      ciphertext,
      conditionExpr.toWASMConditions(),
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
