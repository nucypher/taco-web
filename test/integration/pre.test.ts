import { Enrico } from '../../src';
import { toBytes } from '../../src/utils';
import { mockAlice, mockBob, mockRetrieveResults, mockUrsulas } from '../utils';

describe('proxy reencryption', () => {
  const plaintext = toBytes('plaintext-message');
  const threshold = 2;
  const shares = 3;
  const ursulas = mockUrsulas().slice(0, shares);
  const label = 'fake-data-label';
  const alice = mockAlice();
  const bob = mockBob();

  it('encrypts and decrypts reencrypted message', async () => {
    const { verifiedKFrags } = await alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );

    const policyEncryptingKey = await alice.getPolicyEncryptingKeyFromLabel(
      label,
    );
    const enrico = new Enrico(policyEncryptingKey);
    const encryptedMessage = enrico.encryptMessage(plaintext);

    const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
    const retrievalResults = mockRetrieveResults(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessage.capsule,
    );
    const policyMessageKit = encryptedMessage
      .asPolicyKit(policyEncryptingKey, threshold)
      .withResult(retrievalResults[0]);

    expect(policyMessageKit.isDecryptableByReceiver()).toBeTruthy();

    const bobPlaintext = bob.verifyFrom(
      policyMessageKit.senderVerifyingKey!,
      policyMessageKit,
    );
    expect(bobPlaintext).toEqual(plaintext);
  });
});
