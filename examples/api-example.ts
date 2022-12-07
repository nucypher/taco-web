
import { BlockchainPolicyParameters, Enrico } from '../src';
import { toBytes } from '../src/utils';
import { fromBytes, mockAlice, mockBob, mockRemoteBob } from '../test/utils';

/**
 * This is an abridged version of PRE API usage example.
 * Please refer to ../test/acceptance/alice-grants.test.ts for the full example.
 */

async function example() {
    // Alice creates a policy and grants access to Bob
    const alice = mockAlice();
    // `remoteBob` is a just a container for public keys of Bob
    const remoteBob = mockRemoteBob();
    const policyParams: BlockchainPolicyParameters = {
        bob: remoteBob,
        label: 'fake-data-label',
        threshold: 2,
        shares: 3,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 1000),
    };
    const policy = await alice.grant(policyParams);

    // Enrico encrypts data on behalf of Alice
    const enrico = new Enrico(policy.policyKey);
    const message = 'secret-message-from-alice';
    const encryptedMessage = enrico.encryptMessage(toBytes(message));

    // Bob retrieves & decrypts encrypted message
    const bob = mockBob();
    const retrievedMessage = await bob.retrieveAndDecrypt(
        policy.policyKey,
        alice.verifyingKey,
        [encryptedMessage],
        policy.encryptedTreasureMap,
    );
    const bobPlaintext = fromBytes(retrievedMessage[0]);
    console.log(bobPlaintext);
}

