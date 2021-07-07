import { encrypt, PublicKey, Signature, Signer } from 'umbral-pre';
import keccak256 from 'keccak256';

import { PolicyMessageKit } from './kits';
import { SIGNATURE_HEADER } from './constants';

export const encryptAndSign = (
  recipientPublicKey: PublicKey,
  plaintext: Buffer,
  signer: Signer,
  senderVerifyingKey: PublicKey
): PolicyMessageKit => {
  const signature = Buffer.from(signer.sign(plaintext).toBytes());
  const payload = Buffer.concat([
    Buffer.from(SIGNATURE_HEADER.SIGNATURE_TO_FOLLOW, 'hex'),
    signature,
    plaintext,
  ]);
  const { ciphertext, capsule } = encrypt(recipientPublicKey, payload);
  return new PolicyMessageKit(
    capsule,
    Buffer.from(ciphertext),
    signature,
    senderVerifyingKey,
    recipientPublicKey
  );
};

export const verifySignature = (
  signature: Buffer,
  message: Buffer,
  verifyingKey: PublicKey
): boolean => {
  return Signature.fromBytes(signature).verify(verifyingKey, message);
};

export const keccakDigest = (m: Buffer): Buffer => keccak256(m);
