import * as umbral from 'umbral-pre';

export type ChecksumAddress = string;
export type HexEncodedBytes = string;
export type Base64EncodedBytes = string;
export type UmbralPublicKey = umbral.PublicKey;
export type UmbralSecretKey = umbral.SecretKey;
export type UmbralSigner = umbral.Signer;
export type UmbralKFrags = umbral.VerifiedCapsuleFrag[];
export interface KFrag {}
export interface PolicyTx {}
export class TreasureMap {
  public toBytes(): Base64EncodedBytes {
    throw new Error('Method not implemented.');
  }
}
// TODO: Remove this interface?
export interface KeyFrags {
  delegatingPublicKey: UmbralPublicKey;
  kFrags: UmbralKFrags[];
}
