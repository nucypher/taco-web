import * as umbral from 'umbral-pre';
import { UmbralPublicKey, UmbralSigner } from '../types';
import { PolicyMessageKit } from './kits';

export const encryptAndSign = (
  recipientEncryptingPk: UmbralPublicKey,
  plaintext: Buffer,
  signer: UmbralSigner
): PolicyMessageKit => {
  // TODO: What is the actual value of `constants.SIGNATURE_TO_FOLLOW` in `nucypher/nucypher`?
  const sigHeader = Buffer.from('SIGNATURE_TO_FOLLOW');
  const signature = Buffer.from(signer.sign(plaintext).toBytes());
  const toSign = Buffer.concat([sigHeader, signature, plaintext]);
  const { ciphertext, capsule } = umbral.encrypt(recipientEncryptingPk, toSign);
  const messageKit = new PolicyMessageKit(
    capsule,
    Buffer.from(ciphertext),
    signature,
    signer.verifyingKey()
  );
  return messageKit;
};
