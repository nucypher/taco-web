import { tDecDecrypter } from './universal_bob';
import { Enrico } from './enrico'
import {
  EncryptedTreasureMap,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';

const tDecConfig : { [key: string]: { [key: string] : any } } = {
  "simple": {
    "policyEncryptingKey": PublicKey.fromBytes(),
    "encryptedTreasureMap": EncryptedTreasureMap.fromBytes(),
    "publisherVerifyingKey": PublicKey.fromBytes(),
    "decryptingKey": SecretKey.fromBytes()
  }
};

export const makeTDecDecrypter = (configLabel: string, porterUri: string): tDecDecrypter => {
  return new tDecDecrypter(
    porterUri,
    tDecConfig[configLabel]["policyEncryptingKey"],
    tDecConfig[configLabel]["encryptedTreasureMapy"],
    tDecConfig[configLabel]["publisherVerifyingKey"],
    tDecConfig[configLabel]["decryptingKey"])
};

export const makeTDecEncrypter = (configLabel: string): Enrico => {
  return new Enrico(
    tDecConfig[configLabel]["policyEncryptingKey"],
    tDecConfig[configLabel]["publisherVerifyingKey"])
};