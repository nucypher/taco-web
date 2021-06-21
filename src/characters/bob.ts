import { PublicKey } from 'umbral-pre';
import { Alice } from '..';
import { keccakDigest, verifySignature } from '../crypto/api';
import { HRAC_LENGTH } from '../crypto/constants';
import { PolicyMessageKit } from '../crypto/kits';
import { DecryptingPower, SigningPower } from '../crypto/powers';
import { PublishedTreasureMap } from '../policies/collections';
import { UmbralPublicKey } from '../types';
import { Porter } from './porter';

export class Bob {
  private signingPower: SigningPower;
  private decryptingPower: DecryptingPower;
  private treasureMaps: Record<string, PublishedTreasureMap>;

  constructor(signingPower: SigningPower, decryptingPower: DecryptingPower) {
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
    this.treasureMaps = {};
  }

  static fromPublicKeys(
    verifyingKey: UmbralPublicKey,
    encryptingKey: UmbralPublicKey
  ): Bob {
    // Remove prefix for public keys
    const vkBytes = Buffer.from(verifyingKey.toBytes().slice(1));
    const ekBytes = Buffer.from(encryptingKey.toBytes().slice(1));
    const signingPower = new SigningPower(vkBytes);
    const decryptingPower = new DecryptingPower(ekBytes);
    return new Bob(signingPower, decryptingPower);
  }

  public getEncryptingPublicKey(): UmbralPublicKey {
    // TODO: Is this correct key? Should we use decrypting power here?
    return this.decryptingPower.getPublicKey();
  }

  public getSignerPublicKey(): UmbralPublicKey {
    return this.signingPower.getPublicKey();
  }

  public retrieve(): void {}

  public async joinPolicy(label: string, aliceVeryfingKey: UmbralPublicKey) {
    const treasureMap = await this.getTreasureMap(aliceVeryfingKey, label);
    // TODO: Is following treasure map required at this point? Do we have to keep
    //       track of know Ursulas internally, since we rely on Porter on Ursula
    //       discovery?
    // this.followTreasureMap(treasureMap);
  }

  private async getTreasureMap(
    verifyingKey: PublicKey,
    label: string
  ): Promise<PublishedTreasureMap> {
    const mapId = this.makeMapIdentifier(verifyingKey, label);
    const treasureMap = await Porter.getTreasureMap(
      mapId,
      this.getEncryptingPublicKey()
    );
    this.tryOrient(treasureMap, verifyingKey);
    this.treasureMaps[mapId] = treasureMap;
    return treasureMap;
  }

  private tryOrient(
    treasureMap: PublishedTreasureMap,
    aliceVeryfingKey: PublicKey
  ) {
    const alice = Alice.fromPublicKey(aliceVeryfingKey);
    treasureMap.orient(alice, this);
  }

  private makeMapIdentifier(verifyingKey: PublicKey, label: string): string {
    const hrac = this.makePolicyHrac(verifyingKey, label);
    const mapId = keccakDigest(Buffer.concat([verifyingKey.toBytes(), hrac]));
    return mapId.toString('hex');
  }

  private makePolicyHrac(verifyingKey: PublicKey, label: string) {
    return keccakDigest(
      Buffer.concat([
        verifyingKey.toBytes(),
        this.getSignerPublicKey().toBytes(),
        Buffer.from(label),
      ])
    ).slice(0, HRAC_LENGTH);
  }

  private followTreasureMap(treasureMap: PublishedTreasureMap): Buffer {
    throw new Error('Method not implemented.');
  }

  public verifyFrom(stranger: Alice, messageKit: PolicyMessageKit): Buffer {
    const cleartextWithSignatureHeader = this.decryptingPower.decrypt(
      messageKit
    );
    const digestLength = 8;
    const signatureHeader = cleartextWithSignatureHeader.slice(0, digestLength);
    const cleartext = cleartextWithSignatureHeader.slice(digestLength);

    // TODO: Use proper value for SIGNATURE_TO_FOLLOW
    if (signatureHeader !== Buffer.from('SIGNATURE_TO_FOLLOW')) {
      // TODO: Handle SIGNATURE_IS_ON_CIPHERTEXT
      // TODO: Handle NOT_SIGNED
      throw Error(
        `Unrecognized signature header: ${signatureHeader.toString('hex')}`
      );
    }

    const signatureLength = 16; // TODO: What is the length of the signature?
    const signatureFromKit = cleartext.slice(0, signatureLength);
    const message = cleartext.slice(signatureLength);

    const isValid = verifySignature(
      signatureFromKit,
      message,
      stranger.getSignerPublicKey()
    );
    if (!isValid) {
      throw Error('Invalid signature on MessageKit');
    }

    // Not checking "node on the other end" of message, since it's only for federated mode

    return cleartext;
  }
}
