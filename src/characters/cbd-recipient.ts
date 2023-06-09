import {
  Ciphertext,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  Context,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  SessionSecretFactory,
  SessionSharedSecret,
  SharedSecret,
  ThresholdDecryptionRequest,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ConditionSet } from '../conditions';
import { DkgRitual, FerveoVariant } from '../dkg';
import { ChecksumAddress } from '../types';
import { fromJSON, toBytes, toJSON } from '../utils';

import { CbdDecryptResult, Porter } from './porter';

export type CbdTDecDecrypterJSON = {
  porterUri: string;
  ursulas: Array<ChecksumAddress>;
  threshold: number;
};

export class CbdTDecDecrypter {
  private readonly porter: Porter;

  // private readonly verifyingKey: Keyring;

  constructor(
    porterUri: string,
    private readonly ursulas: Array<ChecksumAddress>,
    private readonly threshold: number
  ) {
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

    // TODO: Move ThresholdDecryptionRequest creation and parsing to Porter?
    const { sessionSharedSecret, encryptedRequest } =
      this.makeDecryptionRequest(
        ritualId,
        variant,
        ciphertext,
        conditionSet,
        contextStr
      );

    const cbdDecryptResult = await this.porter.cbdDecrypt(
      encryptedRequest,
      this.ursulas,
      this.threshold
    );

    return this.makeDecryptionShares(
      cbdDecryptResult,
      sessionSharedSecret,
      variant
    );
  }

  private makeDecryptionShares(
    cbdDecryptResult: CbdDecryptResult,
    sessionSharedSecret: SessionSharedSecret,
    variant: number
  ) {
    const decryptedResponses = Object.entries(
      cbdDecryptResult.encryptedResponses
    ).map(([, encryptedResponse]) =>
      encryptedResponse.decrypt(sessionSharedSecret)
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

  private makeDecryptionRequest(
    ritualId: number,
    variant: number,
    ciphertext: Ciphertext,
    conditionSet: ConditionSet,
    contextStr: string
  ) {
    const decryptionRequest = new ThresholdDecryptionRequest(
      ritualId,
      variant,
      ciphertext,
      conditionSet.toWASMConditions(),
      new Context(contextStr)
    );

    const secretFactory = SessionSecretFactory.random();
    const label = toBytes(`${ritualId}`);
    const ursulaPublicKey = secretFactory.makeKey(label).publicKey();
    const requesterSecretKey = secretFactory.makeKey(label);
    const sessionSharedSecret =
      requesterSecretKey.deriveSharedSecret(ursulaPublicKey);

    const encryptedRequest = decryptionRequest.encrypt(
      sessionSharedSecret,
      requesterSecretKey.publicKey()
    );
    return { sessionSharedSecret, encryptedRequest };
  }

  public toObj(): CbdTDecDecrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      ursulas: this.ursulas,
      threshold: this.threshold,
    };
  }

  public toJSON(): string {
    return toJSON(this.toObj());
  }

  public static fromObj({
    porterUri,
    ursulas,
    threshold,
  }: CbdTDecDecrypterJSON) {
    return new CbdTDecDecrypter(porterUri, ursulas, threshold);
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
