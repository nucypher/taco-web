import * as fs from 'fs';

import { CapsuleFrag, EncryptedTreasureMap, PublicKey, VerifiedKeyFrag } from '@nucypher/nucypher-core';
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { FullProof, generateProof, verifyProof } from "@semaphore-protocol/proof"

import { BlockchainPolicyParameters, Bob, EnactedPolicy, Enrico, MessageKit, RemoteBob } from '../../src';
import { Ursula } from '../../src/characters/porter';
import { ChecksumAddress } from '../../src/types';
import generateSignalHash, { fromBase64, sha256, toBase64, toBytes } from '../../src/utils';
import {
    bytesEqual,
    fromBytes,
    mockAlice,
    mockBob,
    mockEncryptTreasureMap,
    mockGenerateKFrags,
    mockGetUrsulas,
    mockMakeTreasureMap,
    mockPublishToBlockchain,
    mockRemoteBob,
    mockRetrieveCFragsRequest,
    mockTemporaryBob,
    mockUrsulas,
    reencryptKFrags,
} from '../utils';

describe('story: alice shares message with bob through policy', () => {
    const message = 'secret-message-from-alice';
    const threshold = 2;
    const shares = 3;
    const startDate = new Date();
    const endDate = new Date(Date.now() + 60 * 1000);
    const mockedUrsulas = mockUrsulas().slice(0, shares);

    // Intermediate variables used for mocking
    let encryptedTreasureMap: EncryptedTreasureMap;
    let verifiedKFrags: VerifiedKeyFrag[];
    let ursulaAddresses: ChecksumAddress[];

    // Application side-channel
    const label = 'fake-data-label';
    let policy: EnactedPolicy;
    let encryptedMessage: MessageKit;
    let aliceVerifyingKey: PublicKey;
    let policyEncryptingKey: PublicKey;
    let enricoVerifyingKey: PublicKey;

    // Semaphore-specific side-channel
    // Note: We assume that we have a side-channel that permits broadcast type messages
    // without having to establish identities of the parties (in a way that would make it
    // possible to deanonymize them)
    let group: Group;
    let bobProof: FullProof;
    let bobSignal: string;
    let tmpBob: Bob;

    it('alice creates a new off-chain group', async () => {
        group = new Group()
    });

    it('bob joins the group', async () => {
        const bob = mockRemoteBob();
        const bobKey = bob.verifyingKey.toString();

        // Bob crates an Identity and joins the group
        const bobIdentity = new Identity(bobKey)
        const bobCommitment = bobIdentity.generateCommitment().toString()
        // Note: Since this group is off-chain, we need to send an updated group through the side channel
        group.addMember(bobCommitment);

        // Now, Bob is going to create a temporary key pair to be used in PRE
        tmpBob = mockTemporaryBob();

        // Prepares a signal that contains Bobs private keys
        bobSignal = JSON.stringify({
            decryptingKey: toBase64(tmpBob.decryptingKey.toBytes()),
            verifyingKey: toBase64(tmpBob.verifyingKey.toBytes())
        })
        // Hashing a signal because proof inputs must be smaller than 32 bytes
        const signalHash = sha256(bobSignal);
        console.log({ signalHash, length: signalHash.length });
        // TODO: I'm just going to slice it to 31 bytes for now, this is obviously not right, but without this
        // maneuver it throws error "bytes32 string must be less than 32 bytes"
        const preparedSignal = signalHash.slice(0, 31);
        console.log({ preparedSignal, length: preparedSignal.length });

        // Bob sends the signal
        const externalNullifier = group.root
        bobProof = await generateProof(bobIdentity, group, externalNullifier, preparedSignal, {
            zkeyFilePath: "./trusted-setup/semaphore.zkey",
            wasmFilePath: "./trusted-setup/semaphore.wasm"
        })

    });

    it('alice verifies bob membership', async () => {
        // Note: This is what Ursula should check as part of conditions, but in this PoC we
        // let Alice do that in order to causing a too big of a mess

        // Is the signal coming from the group?
        // Is Bob a member of the group?
        const verificationKey = JSON.parse(fs.readFileSync("./trusted-setup/semaphore.json", "utf-8"))
        const isOk = await verifyProof(verificationKey, bobProof);
        if (!isOk) {
            throw new Error('Proof is invalid');
        }

        // Does signal hash matches the original hash?
        // Notice that the contents are actually hashed twice: once before generating the proof, and 
        // once during proof generation.
        // TODO: Remove this slicing after making sha256 return less than 32 bytes
        const firstHash = sha256(bobSignal).slice(0, 31);
        const actualHash = generateSignalHash(firstHash).toString();
        console.log({ actualHash })
        const expectedHash = bobProof.publicSignals.signalHash;
        console.log({ expectedHash })
        if (actualHash !== expectedHash) {
            throw new Error('Proof doesn\'t match the plaintext signal')
        }
    });

    it('alice grants a new policy to the bob', async () => {
        const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
        const generateKFragsSpy = mockGenerateKFrags();
        const publishToBlockchainSpy = mockPublishToBlockchain();
        const makeTreasureMapSpy = mockMakeTreasureMap();
        const encryptTreasureMapSpy = mockEncryptTreasureMap();

        const alice = mockAlice();

        // Alice recovers temporary, remote Bob representation from plaintext signal
        const signalObj: {
            decryptingKey: string,
            verifyingKey: string
        } = JSON.parse(bobSignal);
        const tmpRemoteBob = {
            decryptingKey: PublicKey.fromBytes(fromBase64(signalObj.decryptingKey)),
            verifyingKey: PublicKey.fromBytes(fromBase64(signalObj.verifyingKey))
        }

        // TODO: Is it a good idea to use this root hash as a groupId?
        // const groupId = group.root.toString();
        const policyParams: BlockchainPolicyParameters = {
            bob: tmpRemoteBob,
            label,
            threshold,
            shares,
            startDate,
            endDate,
        };
        policy = await alice.grant(policyParams);

        expect(policy.aliceVerifyingKey).toEqual(alice.verifyingKey.toBytes());
        expect(policy.label).toBe(label);
        expect(getUrsulasSpy).toHaveBeenCalled();
        expect(generateKFragsSpy).toHaveBeenCalled();
        expect(publishToBlockchainSpy).toHaveBeenCalled();
        expect(encryptTreasureMapSpy).toHaveBeenCalled();
        expect(makeTreasureMapSpy).toHaveBeenCalled();

        // Persist side-channel
        aliceVerifyingKey = alice.verifyingKey;
        policyEncryptingKey = policy.policyKey;
        encryptedTreasureMap = await encryptTreasureMapSpy.mock.results[0].value;

        // Persist variables for mocking and testing
        ursulaAddresses = (makeTreasureMapSpy.mock.calls[0][0] as Ursula[]).map(
            (u) => u.checksumAddress,
        );
        verifiedKFrags = makeTreasureMapSpy.mock.calls[0][1] as VerifiedKeyFrag[];
    });

    it('enrico encrypts the message', () => {
        const enrico = new Enrico(policyEncryptingKey);
        encryptedMessage = enrico.encryptMessage(toBytes(message));
        enricoVerifyingKey = enrico.verifyingKey;
    });

    it('bob retrieves and decrypts the message', async () => {
        const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
        const retrieveCFragsSpy = mockRetrieveCFragsRequest(
            ursulaAddresses,
            verifiedKFrags,
            encryptedMessage.capsule,
        );
        
        // Bob is going to use his temporary identity to perform retrieval and decryption
        const retrievedMessage = await tmpBob.retrieveAndDecrypt(
            policyEncryptingKey,
            aliceVerifyingKey,
            [encryptedMessage],
            encryptedTreasureMap,
        );
        const bobPlaintext = fromBytes(retrievedMessage[0]);

        expect(getUrsulasSpy).toHaveBeenCalled();
        expect(retrieveCFragsSpy).toHaveBeenCalled();
        expect(bobPlaintext).toEqual(message);

        // Can data received by Bob be decrypted?
        const [
            _treasureMap,
            _retrievalKits,
            aliceVerifyingKey_,
            bobEncryptingKey_,
            bobVerifyingKey_,
        ] = retrieveCFragsSpy.mock.calls[0];
        expect(
            bytesEqual(aliceVerifyingKey_.toBytes(), aliceVerifyingKey.toBytes()),
        );
        expect(
            bytesEqual(bobEncryptingKey_.toBytes(), tmpBob.decryptingKey.toBytes()),
        );
        expect(bytesEqual(bobVerifyingKey_.toBytes(), tmpBob.verifyingKey.toBytes()));

        const { verifiedCFrags } = reencryptKFrags(
            verifiedKFrags,
            encryptedMessage.capsule,
        );
        const cFrags = verifiedCFrags.map((verifiedCFrag) =>
            CapsuleFrag.fromBytes(verifiedCFrag.toBytes()),
        );
        const areVerified = cFrags.every((cFrag) =>
            cFrag.verify(
                encryptedMessage.capsule,
                aliceVerifyingKey_,
                policyEncryptingKey,
                tmpBob.decryptingKey,
            ),
        );
        expect(areVerified).toBeTruthy();
    });
});
