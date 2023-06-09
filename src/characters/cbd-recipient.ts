import {
  Ciphertext,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  Context,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  SessionSecretFactory,
  SessionSharedSecret,
  SessionStaticKey,
  SharedSecret,
  ThresholdDecryptionRequest,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { DkgCoordinatorAgent, DkgParticipant } from '../agents/coordinator';
import { ConditionSet } from '../conditions';
import { DkgRitual, FerveoVariant } from '../dkg';
import { fromHexString, fromJSON, toBytes, toJSON } from '../utils';

import { Porter } from './porter';

export type CbdTDecDecrypterJSON = {
  porterUri: string;
  threshold: number;
};

export class CbdTDecDecrypter {
  private readonly porter: Porter;

  // private readonly verifyingKey: Keyring;

  constructor(porterUri: string, private readonly threshold: number) {
    this.porter = new Porter(porterUri);
  }

  public async retrieveAndDecrypt(
    provider: ethers.providers.Web3Provider,
    conditionSet: ConditionSet,
    dkgRitual: DkgRitual,
    variant: number,
    ciphertext: Ciphertext,
    aad: Uint8Array
  ): Promise<readonly Uint8Array[]> {
    const decryptionShares = await this.retrieve(
      provider,
      conditionSet,
      dkgRitual.id,
      variant,
      ciphertext
    );

    // TODO: Replace with a factory method
    let sharedSecret: SharedSecret;
    if (variant === FerveoVariant.Simple) {
      sharedSecret = combineDecryptionSharesSimple(
        decryptionShares as DecryptionShareSimple[]
      );
    } else if (variant === FerveoVariant.Precomputed) {
      sharedSecret = combineDecryptionSharesPrecomputed(
        decryptionShares as DecryptionSharePrecomputed[]
      );
    } else {
      throw new Error(`Unknown variant ${variant}`);
    }

    const plaintext = decryptWithSharedSecret(
      ciphertext,
      aad,
      sharedSecret,
      dkgRitual.dkgPublicParams
    );
    return [plaintext];
  }

  public async retrieve(
    provider: ethers.providers.Web3Provider,
    conditionSet: ConditionSet,
    ritualId: number,
    variant: number,
    ciphertext: Ciphertext
  ): Promise<DecryptionSharePrecomputed[] | DecryptionShareSimple[]> {
    const contextStr = await conditionSet.buildContext(provider).toJson();

    const dkgParticipants = await DkgCoordinatorAgent.getParticipants(
      provider,
      ritualId
    );

    const { sharedSecrets, encryptedRequests } = this.makeDecryptionRequests(
      ritualId,
      variant,
      ciphertext,
      conditionSet,
      contextStr,
      dkgParticipants
    );

    const { encryptedResponses } = await this.porter.cbdDecrypt(
      encryptedRequests,
      this.threshold
    );

    return this.makeDecryptionShares(
      encryptedResponses,
      sharedSecrets,
      variant
    );
  }

  private makeDecryptionShares(
    encryptedResponses: Record<string, EncryptedThresholdDecryptionResponse>,
    sessionSharedSecret: Record<string, SessionSharedSecret>,
    variant: number
  ) {
    const decryptedResponses = Object.entries(encryptedResponses).map(
      ([ursula, encryptedResponse]) =>
        encryptedResponse.decrypt(sessionSharedSecret[ursula])
    );

    const variants = decryptedResponses.map((resp) => resp.ritualId);
    if (variants.some((v) => v !== variant)) {
      throw new Error('Decryption shares are not of the same variant');
    }

    const decryptionShares = decryptedResponses.map(
      (resp) => resp.decryptionShare
    );
    // TODO: Replace with a factory method
    if (variant === FerveoVariant.Simple) {
      return decryptionShares.map((share) =>
        DecryptionShareSimple.fromBytes(share)
      );
    } else if (variant === FerveoVariant.Precomputed) {
      return decryptionShares.map((share) =>
        DecryptionSharePrecomputed.fromBytes(share)
      );
    } else {
      throw new Error(`Unknown variant ${variant}`);
    }
  }

  private makeDecryptionRequests(
    ritualId: number,
    variant: number,
    ciphertext: Ciphertext,
    conditionSet: ConditionSet,
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
      conditionSet.toWASMConditions(),
      new Context(contextStr)
    );
    const secretFactory = SessionSecretFactory.random();
    const label = toBytes(`${ritualId}`);
    const requesterSecretKey = secretFactory.makeKey(label);

    const sharedSecrets: Record<string, SessionSharedSecret> =
      Object.fromEntries(
        dkgParticipants.map((participant) => {
          const decKey = SessionStaticKey.fromBytes(
            fromHexString(participant.decryptionRequestStaticKey)
          );
          const sessionSharedSecret =
            requesterSecretKey.deriveSharedSecret(decKey);
          return [participant.provider, sessionSharedSecret];
        })
      );

    const encryptedRequests: Record<
      string,
      EncryptedThresholdDecryptionRequest
    > = Object.fromEntries(
      Object.entries(sharedSecrets).map(([provider, sessionSharedSecret]) => {
        const encryptedRequest = decryptionRequest.encrypt(
          sessionSharedSecret,
          requesterSecretKey.publicKey()
        );
        return [provider, encryptedRequest];
      })
    );

    return { sharedSecrets, encryptedRequests };
  }

  public toObj(): CbdTDecDecrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      threshold: this.threshold,
    };
  }

  public toJSON(): string {
    return toJSON(this.toObj());
  }

  public static fromObj({ porterUri, threshold }: CbdTDecDecrypterJSON) {
    return new CbdTDecDecrypter(porterUri, threshold);
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
