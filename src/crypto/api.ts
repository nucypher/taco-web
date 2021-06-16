import * as umbral from 'umbral-pre';
import keccak256 from 'keccak256';
import secp256k1 from 'secp256k1';

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

export const keccakDigest = (m: Buffer): Buffer => keccak256(m);

export const verifySignature = (
  signature: Buffer,
  message: Buffer,
  verifyingKey: UmbralPublicKey
): boolean => {
  // TODO: Verify this implementation against `nucypher/nucypher`
  return secp256k1.ecdsaVerify(signature, message, verifyingKey.toBytes());
};
