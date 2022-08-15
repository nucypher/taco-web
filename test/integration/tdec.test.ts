import { SecretKey, VerifiedKeyFrag } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';
import { Ursula } from '../../src/characters/porter';
import { Conditions, ConditionSet } from '../../src/policies/conditions'
import { MessageKit, ConditionsIntegrator } from '../../src/core'

import { generateTDecEntities } from '../../src/characters/tDec';
import { toBytes } from '../../src/utils';
import {
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
  mockUrsulas,
  mockWeb3Provider,
} from '../utils';

describe('threshold decryption', () => {
  const plaintext = toBytes('plaintext-message');

  it('encrypts and decrypts reencrypted message from dynamic config', async () => {
    const threshold = 3;
    const shares = 5;
    const label = 'test';
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // In 30 days
    const aliceSecretKey = SecretKey.random()
    const provider = mockWeb3Provider(aliceSecretKey.toSecretBytes());

    // Setup mocks for `generateTDecEntities`
    const mockedUrsulas = mockUrsulas().slice(0, shares);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const [encrypter, decrypter, policy] = await generateTDecEntities(
      threshold,
      shares,
      provider,
      label,
      startDate,
      endDate,
      'https://porter-ibex.nucypher.community',
      aliceSecretKey
    );

    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    const ownsBufficornNFT = new Conditions.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591]
    })

    const conditions = new ConditionSet([ownsBufficornNFT])
    encrypter.conditions = conditions

    const encryptedMessageKit = encrypter.encryptMessage(plaintext);
    
    
    const bytes = encryptedMessageKit.toBytes()
    expect(bytes).toContain(188) // the ESC delimter
    const conditionbytes = ConditionsIntegrator.parse(bytes).conditionsBytes

    if (conditionbytes){
      const reconstituted = ConditionSet.fromBytes(conditionbytes)
      expect(reconstituted.toList()[0].contractAddress).toEqual(ownsBufficornNFT.value.contractAddress)
    }


    // Setup mocks for `retrieveAndDecrypt`
    const getUrsulasSpy2 = mockGetUrsulas(mockedUrsulas);
    const ursulaAddresses = (makeTreasureMapSpy.mock.calls[0][0] as Ursula[]).map(
      (u) => u.checksumAddress,
    );
    const verifiedKFrags = makeTreasureMapSpy.mock.calls[0][1] as VerifiedKeyFrag[];
    const retrieveCFragsSpy = mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessageKit.capsule,
    );

    const bobPlaintext = await decrypter.retrieveAndDecrypt([
      encryptedMessageKit,
    ]);

    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(bobPlaintext[0]).toEqual(plaintext);

  });
});
