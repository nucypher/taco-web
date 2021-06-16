import * as umbral from 'umbral-pre';
import { IUrsula } from '../characters/porter';
import { Arrangement } from './policy';
import { ChecksumAddress, UmbralSigner } from '../types';
import { encryptAndSign, keccakDigest } from '../crypto/api';
import { HRAC_LENGTH } from '../crypto/constants';
import { PolicyMessageKit } from '../crypto/kits';

export interface PreparedTreasureMap {
  hrac: Buffer;
  publicSignature: Buffer;
  payload: Buffer;
  id: Buffer;
  nodes: Record<ChecksumAddress, Buffer>;
}

export class TreasureMap {
  private destinations: Record<ChecksumAddress, Buffer>;
  private m: number;

  constructor(m: number) {
    this.m = m;
    this.destinations = {};
  }

  public addArrangement(ursula: IUrsula, arrangement: Arrangement) {
    this.destinations[ursula.checksumAddress] = arrangement.getId();
  }

  private nodesAsBytes(): Buffer {
    const toConcat: Buffer[] = [];
    Object.entries(this.destinations).forEach(
      ([ursulaAddress, arrangementId]) => {
        toConcat.push(toCanonicalAddress(ursulaAddress));
        toConcat.push(arrangementId);
      }
    );
    return Buffer.concat(toConcat);
  }

  public prepareForPublication(
    bobEncryptingKey: umbral.PublicKey,
    bobVerifyingKey: umbral.PublicKey,
    aliceSigner: umbral.Signer,
    label: string
  ): PreparedTreasureMap {
    const mBytes = Buffer.from([this.m]);
    const plaintext = Buffer.concat([mBytes, this.nodesAsBytes()]);
    const messageKit = encryptAndSign(bobEncryptingKey, plaintext, aliceSigner);

    const aliceSignerPk = aliceSigner.verifyingKey().toBytes();
    const hrac = this.makeHrac(aliceSignerPk, bobVerifyingKey, label);
    const publicSignature = Buffer.from(
      aliceSigner.sign(Buffer.concat([aliceSignerPk, hrac])).toBytes()
    );
    const payload = Buffer.concat([
      publicSignature,
      hrac,
      messageKit.toBytes(),
    ]);
    const id = this.makeId(messageKit, hrac);

    return {
      hrac,
      publicSignature,
      payload,
      id,
      nodes: this.destinations,
    };
  }

  private makeId(messageKit: PolicyMessageKit, hrac: Buffer) {
    const vk = messageKit.getVerifyingKey().toBytes();
    return keccakDigest(Buffer.concat([vk, hrac]));
  }

  private makeHrac(
    aliceSignerPk: Uint8Array,
    bobVerifyingKey: umbral.PublicKey,
    label: string
  ) {
    const hracBytes = [
      aliceSignerPk,
      bobVerifyingKey.toBytes(),
      Buffer.from(label),
    ];
    const hrac = keccakDigest(Buffer.concat(hracBytes)).slice(0, HRAC_LENGTH);
    return hrac;
  }
}

const toCanonicalAddress = (address: string): Buffer => {
  const prefix = '0x';
  const nonPrefixed = address.startsWith(prefix)
    ? address.substring(prefix.length)
    : address;
  return Buffer.from(nonPrefixed, 'hex');
};

export class Revocation {
  private PREFIX: Buffer = Buffer.from('REVOKE-');
  private arrangementId: Buffer;
  private signature: Buffer;

  constructor(arrangementId: Buffer, signer: UmbralSigner) {
    this.arrangementId = arrangementId;
    const message = Buffer.concat([this.PREFIX, arrangementId]);
    this.signature = Buffer.from(signer.sign(message).toBytes());
  }
}
