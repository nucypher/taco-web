import * as umbral from 'umbral-pre';
import { GetUrsulasResponse } from '../src/characters/porter';
import { UmbralSecretKey, UmbralPublicKey } from '../src/types';

export interface BobKeys {
  encryptingPrivateKey: UmbralSecretKey;
  signingPrivateKey: UmbralSecretKey;
  encryptingPublicKey: UmbralPublicKey;
  signingPublicKey: UmbralPublicKey;
}

export const mockBobKeys = (): BobKeys => {
  const encryptingPrivateKey = umbral.SecretKey.random();
  const signingPrivateKey = umbral.SecretKey.random();
  return {
    encryptingPrivateKey,
    signingPrivateKey,
    encryptingPublicKey: umbral.PublicKey.fromSecretKey(encryptingPrivateKey),
    signingPublicKey: umbral.PublicKey.fromSecretKey(signingPrivateKey),
  };
};

export const mockPorterUrsulas = (): GetUrsulasResponse => {
  // TODO: Those Ursulas were published in Porter PR 2717. Can they be used in testing?
  return {
    result: {
      ursulas: [
        {
          encrypting_key:
            '025a335eca37edce8191d43c156e7bc6b451b21e5258759966bbfe0e6ce44543cb',
          checksum_address: '0x5cF1703A1c99A4b42Eb056535840e93118177232',
          uri: 'https://example.a.com:9151',
        },
        {
          encrypting_key:
            '02b0a0099ee180b531b4937bd7446972296447b2479ca6259cb6357ed98b90da3a',
          checksum_address: '0x7fff551249D223f723557a96a0e1a469C79cC934',
          uri: 'https://example.b.com:9151',
        },
        {
          encrypting_key:
            '02761c765e2f101df39a5f680f3943d0d993ef9576de8a3e0e5fbc040d6f8c15a5',
          checksum_address: '0x9C7C824239D3159327024459Ad69bB215859Bd25',
          uri: 'https://example.c.com:9151',
        },
        {
          encrypting_key:
            '0258b7c79fe73f3499de91dd5a5341387184035d0555b10e6ac762d211a39684c0',
          checksum_address: '0x9919C9f5CbBAA42CB3bEA153E14E16F85fEA5b5D',
          uri: 'https://example.d.com:9151',
        },
        {
          encrypting_key:
            '02e43a623c24db4f62565f82b6081044c1968277edfdca494a81c8fd0826e0adf6',
          checksum_address: '0xfBeb3368735B3F0A65d1F1E02bf1d188bb5F5BE6',
          uri: 'https://example.e.com:9151',
        },
      ],
    },
    version: '5.2.0',
  };
};
