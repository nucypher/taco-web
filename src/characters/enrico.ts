import { PublicKey } from 'umbral-pre';

import { MessageKit } from '../kits/message';
import { toBytes } from '../utils';

/**
 * Enrico - "The Encryptor"
 */
export class Enrico {
  public readonly policyEncryptingKey: PublicKey;

  constructor(policyEncryptingKey: PublicKey) {
    this.policyEncryptingKey = policyEncryptingKey;
  }

  /**
   * Encrypts a message to be decrypted according to the policy.
   * @param plaintext
   */
  public encryptMessage(plaintext: Uint8Array | string): MessageKit {
    return MessageKit.author(
      this.policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext)
    );
  }
}
