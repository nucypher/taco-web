import {
  Deserializer,
  Versioned,
  VersionedDeserializers,
  VersionedParser,
  VersionHandler,
  VersionTuple,
} from '../../src/versioning';

class VersionedTest implements Versioned {
  public static BRAND = 'Test';
  public static VERSION: VersionTuple = [ 2, 0 ];

  constructor(public readonly payload: Uint8Array) {
  }

  private get header(): Uint8Array {
    return VersionedParser.encodeHeader(VersionedTest.BRAND, VersionedTest.VERSION);
  }

  public toBytes(): Uint8Array {
    return new Uint8Array([ ...this.header, ...this.payload ]);
  }

  public static fromBytes(bytes: Uint8Array): VersionedTest {
    return VersionedParser.fromVersionedBytes(VersionedTest.getVersionHandler(), bytes);
  }

  protected static getVersionHandler(): VersionHandler {
    const oldVersionDeserializers = (): VersionedDeserializers<Versioned> => {
      // Old deserializer just drops the first byte
      const deserializerV10 = (bytes: Uint8Array) => new VersionedTest(bytes.slice(1));
      return { 1: { 0: deserializerV10 as unknown as Deserializer } };
    };
    const currentVersionDeserializer: Deserializer = <T extends Versioned>(bytes: Uint8Array): T => {
      return new VersionedTest(bytes) as unknown as T;
    };
    return {
      oldVersionDeserializers,
      currentVersionDeserializer,
      brand: VersionedTest.BRAND,
      version: VersionedTest.VERSION,
    };
  }

}

describe('versioned', () => {
  it('serializes and deserialized current version', () => {
    const payload = new Uint8Array([ 0, 1, 2, 3 ]);
    const vt = new VersionedTest(payload);
    expect(vt.payload).toEqual(payload);
    expect(vt.toBytes()).toEqual(new Uint8Array([ 84, 101, 115, 116, 0, 2, 0, 0, 0, 1, 2, 3 ]));

    const recovered = VersionedTest.fromBytes(vt.toBytes());
    expect(recovered.payload).toEqual(payload);
  });

  it('serializes and deserialized previous version', () => {
    VersionedTest.VERSION = [ 1, 0 ]; // Use an old version

    const payload = new Uint8Array([ 0, 1, 2, 3 ]);
    const vt = new VersionedTest(payload);
    expect(vt.toBytes()).toEqual(new Uint8Array([ 84, 101, 115, 116, 0, 1, 0, 0, 0, 1, 2, 3 ]));

    const recovered = VersionedTest.fromBytes(vt.toBytes());
    expect(recovered.payload).toEqual(payload.slice(1)); // Version 1.0 is one byte short
  });
});
