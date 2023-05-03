import {
  AggregatedTranscript,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  Dkg,
  encrypt,
  EthereumAddress,
  Keypair,
  Validator,
  ValidatorMessage,
} from 'ferveo-wasm';

const zip = <A1, A2>(a: Array<A1>, b: Array<A2>): Array<[A1, A2]> =>
  a.map((k: A1, i: number) => [k, b[i]]);

const genEthAddr = (i: number) => {
  const ethAddr =
    '0x' + '0'.repeat(40 - i.toString(16).length) + i.toString(16);
  return EthereumAddress.fromString(ethAddr);
};

function setupTest() {
  const tau = 1;
  const sharesNum = 4;
  const threshold = Math.floor((sharesNum * 2) / 3);

  const validator_keypairs: Keypair[] = [];
  const validators: Validator[] = [];
  for (let i = 0; i < sharesNum; i++) {
    const keypair = Keypair.random();
    validator_keypairs.push(keypair);
    const validator = new Validator(genEthAddr(i), keypair.publicKey);
    validators.push(validator);
  }

  // Each validator holds their own DKG instance and generates a transcript every
  // validator, including themselves
  const messages: ValidatorMessage[] = [];
  validators.forEach((sender) => {
    const dkg = new Dkg(tau, sharesNum, threshold, validators, sender);
    const transcript = dkg.generateTranscript();
    const message = new ValidatorMessage(sender, transcript);
    messages.push(message);
  });

  // Now that every validator holds a dkg instance and a transcript for every other validator,
  // every validator can aggregate the transcripts
  const dkg = new Dkg(tau, sharesNum, threshold, validators, validators[0]);

  // Let's say that we've only received `threshold` transcripts
  const receivedMessages = messages.slice(0, threshold);

  const serverAggregate = dkg.aggregateTranscript(receivedMessages);
  expect(serverAggregate.verify(sharesNum, receivedMessages)).toBe(true);

  // Client can also aggregate the transcripts and verify them
  const clientAggregate = new AggregatedTranscript(receivedMessages);
  expect(clientAggregate.verify(sharesNum, receivedMessages)).toBe(true);

  // In the meantime, the client creates a ciphertext and decryption request
  const msg = Buffer.from('my-msg');
  const aad = Buffer.from('my-aad');
  const ciphertext = encrypt(msg, aad, dkg.finalKey());

  return {
    tau,
    sharesNum,
    threshold,
    validator_keypairs,
    validators,
    dkg,
    receivedMessages,
    msg,
    aad,
    ciphertext,
  };
}

// This test suite replicates tests from ferveo-wasm/tests/node.rs
describe('ferveo-wasm', () => {
  it('simple tdec variant', () => {
    const {
      tau,
      sharesNum,
      threshold,
      validator_keypairs,
      validators,
      dkg,
      receivedMessages,
      msg,
      aad,
      ciphertext,
    } = setupTest();

    // Having aggregated the transcripts, the validators can now create decryption shares
    const decryptionShares: DecryptionShareSimple[] = [];
    zip(validators, validator_keypairs).forEach(([validator, keypair]) => {
      expect(validator.publicKey.equals(keypair.publicKey)).toBe(true);

      const dkg = new Dkg(tau, sharesNum, threshold, validators, validator);
      const aggregate = dkg.aggregateTranscript(receivedMessages);
      const isValid = aggregate.verify(sharesNum, receivedMessages);
      expect(isValid).toBe(true);

      const decryptionShare = aggregate.createDecryptionShareSimple(
        dkg,
        ciphertext,
        aad,
        keypair
      );
      decryptionShares.push(decryptionShare);
    });

    // Now, the decryption share can be used to decrypt the ciphertext
    // This part is in the client API

    const sharedSecret = combineDecryptionSharesSimple(
      decryptionShares,
      dkg.publicParams()
    );

    // The client should have access to the public parameters of the DKG

    const plaintext = decryptWithSharedSecret(
      ciphertext,
      aad,
      sharedSecret,
      dkg.publicParams()
    );
    expect(Buffer.from(plaintext)).toEqual(msg);
  });

  it('precomputed tdec variant', () => {
    const {
      tau,
      sharesNum,
      threshold,
      validator_keypairs,
      validators,
      dkg,
      receivedMessages,
      msg,
      aad,
      ciphertext,
    } = setupTest();

    // Having aggregated the transcripts, the validators can now create decryption shares
    const decryptionShares: DecryptionSharePrecomputed[] = [];
    zip(validators, validator_keypairs).forEach(([validator, keypair]) => {
      const dkg = new Dkg(tau, sharesNum, threshold, validators, validator);
      const aggregate = dkg.aggregateTranscript(receivedMessages);
      const isValid = aggregate.verify(sharesNum, receivedMessages);
      expect(isValid).toBe(true);

      const decryptionShare = aggregate.createDecryptionSharePrecomputed(
        dkg,
        ciphertext,
        aad,
        keypair
      );
      decryptionShares.push(decryptionShare);
    });

    // Now, the decryption share can be used to decrypt the ciphertext
    // This part is in the client API

    const sharedSecret = combineDecryptionSharesPrecomputed(decryptionShares);

    // The client should have access to the public parameters of the DKG

    const plaintext = decryptWithSharedSecret(
      ciphertext,
      aad,
      sharedSecret,
      dkg.publicParams()
    );
    expect(Buffer.from(plaintext)).toEqual(msg);
  });
});
