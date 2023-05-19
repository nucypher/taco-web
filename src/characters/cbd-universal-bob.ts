import { Context, ThresholdDecryptionRequest } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';
import {
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  DkgPublicKey,
} from 'ferveo-wasm';
import { SharedSecret } from 'ferveo-wasm';
import { Ciphertext } from 'ferveo-wasm';

import { ConditionSet } from '../conditions';
import { DkgRitual, FerveoVariant } from '../dkg';
import { base64ToU8Receiver, u8ToBase64Replacer } from '../utils';

import { Porter } from './porter';

type CbdTDecDecrypterJSON = {
  porterUri: string;
  encryptingKeyBytes: Uint8Array;
};

export class CbdTDecDecrypter {
  private readonly porter: Porter;

  // private readonly verifyingKey: Keyring;

  constructor(porterUri: string, private readonly dkgPublicKey: DkgPublicKey) {
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
        decryptionShares as DecryptionShareSimple[],
        dkgRitual.dkgPublicParams
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
    const tDecRequest = new ThresholdDecryptionRequest(
      ritualId,
      variant,
      ciphertext.toBytes(),
      conditionSet.toWASMConditions(),
      new Context(contextStr)
    );

    // TODO: This should return multiple responses
    const resp = await this.porter.decrypt(tDecRequest);

    // TODO: Replace with a factory method
    if (variant === FerveoVariant.Simple) {
      return resp.map((r) =>
        DecryptionShareSimple.fromBytes(r.decryptionShare)
      );
    } else if (variant === FerveoVariant.Precomputed) {
      return resp.map((r) =>
        DecryptionSharePrecomputed.fromBytes(r.decryptionShare)
      );
    } else {
      throw new Error(`Unknown variant ${variant}`);
    }
  }

  public toObj(): CbdTDecDecrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      encryptingKeyBytes: this.dkgPublicKey.toBytes(),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    porterUri,
    encryptingKeyBytes,
  }: CbdTDecDecrypterJSON) {
    return new CbdTDecDecrypter(
      porterUri,
      DkgPublicKey.fromBytes(encryptingKeyBytes)
    );
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return CbdTDecDecrypter.fromObj(config);
  }
}
