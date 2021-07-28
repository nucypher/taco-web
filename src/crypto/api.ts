import sha3 from 'js-sha3';
import { encrypt, PublicKey, Signature, Signer } from 'umbral-pre';

import { PolicyMessageKit } from '../kits/message';
import { fromHexString, toBytes } from '../utils';

import { SIGNATURE_HEADER_HEX } from './constants';

export const encryptAndSign = (
  recipientPublicKey: PublicKey,
  plaintext: Uint8Array,
  signer: Signer,
  senderVerifyingKey: PublicKey
): PolicyMessageKit => {
  const signature = signer.sign(plaintext).toBytes();
  const payload = new Uint8Array([
    ...fromHexString(SIGNATURE_HEADER_HEX.SIGNATURE_TO_FOLLOW),
    ...signature,
    ...plaintext,
  ]);
  const { ciphertext, capsule } = encrypt(recipientPublicKey, payload);
  return new PolicyMessageKit(
    capsule,
    ciphertext,
    signature,
    senderVerifyingKey,
    recipientPublicKey
  );
};

export const verifySignature = (
  signature: Uint8Array,
  message: Uint8Array,
  verifyingKey: PublicKey
): boolean => {
  return Signature.fromBytes(signature).verify(verifyingKey, message);
};

export const keccakDigest = (m: Uint8Array): Uint8Array =>
  toBytes(sha3.keccak_256(m)).slice(0, 32);
