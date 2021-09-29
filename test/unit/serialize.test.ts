import { MessageKit } from '../../src/kits/message';
import { TreasureMap } from '../../src/policies/collections';
import { decodeVariableLengthMessage, encodeVariableLengthMessage, split, toBytes, zip } from '../../src/utils';
import { mockAlice, mockBob, mockTreasureMap } from '../utils';

describe('serialization ', () => {
  it('encodes and decodes a variable length message', () => {
    const msg = new Uint8Array([ 0, 1, 2, 3, 4, 5 ]);

    const encodedMsg = encodeVariableLengthMessage(msg);
    const [ decodedMsg, remainder ] = decodeVariableLengthMessage(encodedMsg);

    expect(decodedMsg).toEqual(msg);
    expect(remainder).toEqual(new Uint8Array());
  });

  it('encodes and decodes a message kit', () => {
    const messageKit = MessageKit.author(
      mockBob().decryptingKey,
      toBytes('fake-message'),
      mockAlice().signer,
    );

    const encoded = messageKit.toBytes();
    const decoded = MessageKit.fromBytes(encoded);

    expect(decoded.capsule.toBytes()).toEqual(messageKit.capsule.toBytes());
    expect(decoded.ciphertext).toEqual(messageKit.ciphertext);
    expect(decoded.senderVerifyingKey!.toBytes()).toEqual(messageKit.senderVerifyingKey!.toBytes());
    expect(decoded.signature!.toBytes()).toEqual(messageKit.signature!.toBytes());
  });

  it('splits bytes', async () => {
    const bytes = new Uint8Array([ 0, 0, 1, 1 ]);

    const [ zeroes, ones ] = split(bytes, 2);
    expect(zeroes).toEqual(new Uint8Array([ 0, 0 ]));
    expect(ones).toEqual(new Uint8Array([ 1, 1 ]));

    const [ all, none ] = split(bytes, bytes.length);
    expect(all).toEqual(bytes);
    expect(none).toEqual(new Uint8Array([]));

    const outOfBounds = () => split(bytes, bytes.length + 1);
    expect(outOfBounds).toThrow();
  });

  it('encodes and decodes kFrag destinations', () => {
    const mk = MessageKit.author(
      mockBob().decryptingKey,
      toBytes('fake-message'),
      mockAlice().signer,
    );
    const address = '0x0000000000000000000000000000000000000000';
    const destinations = Object.fromEntries([ [ address, mk ] ]);

    const encoded = (TreasureMap as any).nodesToBytes(destinations);
    const decoded = (TreasureMap as any).bytesToNodes(encoded);
    const decodedMk = Object.values(decoded)[0] as MessageKit;

    expect(Object.keys(decoded)[0]).toEqual(address);
    expect(decodedMk.capsule.toBytes()).toEqual(mk.capsule.toBytes());
    expect(decodedMk.ciphertext).toEqual(mk.ciphertext);
    expect(decodedMk.signature!.toBytes()).toEqual(mk.signature!.toBytes());
    expect(decodedMk.senderVerifyingKey!.toBytes()).toEqual(mk.senderVerifyingKey!.toBytes());
  });

  it('encodes and decodes a treasure map', async () => {
    const treasureMap = await mockTreasureMap();

    const encoded = treasureMap.toBytes();
    const decoded = TreasureMap.fromBytes(encoded);

    expect(decoded.threshold).toEqual(treasureMap.threshold);
    expect(decoded.hrac).toEqual(treasureMap.hrac);

    const sortedKeys = zip(Object.keys(treasureMap.destinations).sort(), Object.keys(decoded.destinations).sort());
    sortedKeys.forEach(([ k1, k2 ]) => {
      expect(k1).toEqual(k2);
      const v1 = treasureMap.destinations[k1];
      const v2 = treasureMap.destinations[k2];
      expect(v1.capsule.toBytes()).toEqual(v2.capsule.toBytes());
      expect(v1.ciphertext).toEqual(v2.ciphertext);
      expect(v1.senderVerifyingKey!.toBytes()).toEqual(v2.senderVerifyingKey!.toBytes());
      expect(v1.signature!.toBytes()).toEqual(v2.signature!.toBytes());
    });
  });
});
