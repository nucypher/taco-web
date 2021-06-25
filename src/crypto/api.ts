import * as umbral from 'umbral-pre';
import keccak256 from 'keccak256';

import { UmbralPublicKey, UmbralSigner } from '../types';
import { PolicyMessageKit } from './kits';
import { SIGNATURE_HEADER } from './constants';

export const encryptAndSign = (
  recipientPublicKey: UmbralPublicKey,
  plaintext: Buffer,
  signer: UmbralSigner,
  signPlaintext: boolean = true
): PolicyMessageKit => {
  if (signPlaintext) {
    const signature = Buffer.from(signer.sign(plaintext).toBytes());
    const payload = Buffer.concat([
      Buffer.from(SIGNATURE_HEADER.SIGNATURE_TO_FOLLOW, 'hex'),
      signature,
      plaintext,
    ]);
    const { ciphertext, capsule } = umbral.encrypt(recipientPublicKey, payload);
    return new PolicyMessageKit(
      capsule,
      Buffer.from(ciphertext),
      signature,
      signer.verifyingKey()
    );
  } else {
    // TODO: This never runs
    const payload = Buffer.concat([
      Buffer.from(SIGNATURE_HEADER.SIGNATURE_IS_ON_CIPHERTEXT, 'hex'),
      plaintext,
    ]);
    const { ciphertext, capsule } = umbral.encrypt(recipientPublicKey, payload);
    const signature = Buffer.from(signer.sign(ciphertext).toBytes());
    return new PolicyMessageKit(
      capsule,
      Buffer.from(ciphertext),
      signature,
      signer.verifyingKey()
    );
  }
};

export const verifySignature = (
  signature: Buffer,
  message: Buffer,
  verifyingKey: UmbralPublicKey
): boolean => {
  return umbral.Signature.fromBytes(signature).verify(verifyingKey, message);
};

export const keccakDigest = (m: Buffer): Buffer => keccak256(m);
