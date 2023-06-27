import {
  Ciphertext,
  Context,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  SessionSharedSecret,
  SessionStaticSecret,
  ThresholdDecryptionRequest,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgParticipant } from '../agents/coordinator';
import { ConditionExpression } from '../conditions';
import {
  DkgRitual,
  FerveoVariant,
  getCombineDecryptionSharesFunction,
  getVariantClass,
} from '../dkg';
import { fromJSON, toJSON } from '../utils';

import { Porter } from './porter';

export type CbdTDecDecrypterJSON = {
  porterUri: string;
  ritualId: number;
  threshold: number;
};

export class CbdTDecDecrypter {
  // private readonly verifyingKey: Keyring;

  private constructor(
    private readonly porter: Porter,
    private readonly ritualId: number,
    private readonly threshold: number
  ) {}

  public static create(porterUri: string, dkgRitual: DkgRitual) {
    return new CbdTDecDecrypter(
      new Porter(porterUri),
      dkgRitual.id,
      dkgRitual.threshold
    );
  }

  // Retrieve and decrypt ciphertext using provider and condition expression
  public async retrieveAndDecrypt(
    provider: ethers.providers.Web3Provider,
    conditionExpr: ConditionExpression,
    variant: FerveoVariant,
    ciphertext: Ciphertext
  ): Promise<Uint8Array> {
    const decryptionShares = await this.retrieve(
      provider,
      conditionExpr,
      variant,
      ciphertext
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
    provider: ethers.providers.Web3Provider,
    conditionExpr: ConditionExpression,
    variant: number,
    ciphertext: Ciphertext
  ): Promise<DecryptionSharePrecomputed[] | DecryptionShareSimple[]> {
    const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
      provider,
      this.ritualId
    );
    // We only need the `threshold` participants
    const sufficientDkgParticipants = dkgParticipants.slice(0, this.threshold);
    const contextStr = await conditionExpr.buildContext(provider).toJson();
    const { sharedSecrets, encryptedRequests } = this.makeDecryptionRequests(
      this.ritualId,
      variant,
      ciphertext,
      conditionExpr,
      contextStr,
      sufficientDkgParticipants
    );

    const { encryptedResponses, errors } = await this.porter.cbdDecrypt(
      encryptedRequests,
      this.threshold
    );

    // TODO: How many errors are acceptable? Less than (threshold - shares)?
    // TODO: If Porter accepts only `threshold` decryption requests, then we may not have any errors
    if (Object.keys(errors).length > 0) {
      throw new Error(
        `CBD decryption failed with errors: ${JSON.stringify(errors)}`
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
    variant: number,
    expectedRitualId: number
  ) {
    const decryptedResponses = Object.entries(encryptedResponses).map(
      ([ursula, encryptedResponse]) =>
        encryptedResponse.decrypt(sessionSharedSecret[ursula])
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
    variant: number,
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

  public toObj(): CbdTDecDecrypterJSON {
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
  }: CbdTDecDecrypterJSON) {
    return new CbdTDecDecrypter(new Porter(porterUri), ritualId, threshold);
  }

  public static fromJSON(json: string) {
    return CbdTDecDecrypter.fromObj(fromJSON(json));
  }

  public equals(other: CbdTDecDecrypter): boolean {
    return (
      this.porter.porterUrl.toString() === other.porter.porterUrl.toString()
    );
  }
}
