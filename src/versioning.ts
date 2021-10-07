import { fromBytes, numberToBytes, split, toBytes, toNumber } from './utils';

export type Deserializer = <T extends Versioned>(bytes: Uint8Array) => T;

export type VersionedDeserializers<T extends Versioned> = Record<
  number,
  Record<number, Deserializer>
>;

export type VersionTuple = [number, number];

export interface VersionHandler {
  brand: string;
  version: VersionTuple;
  currentVersionDeserializer: Deserializer;
  oldVersionDeserializers<T extends Versioned>(): VersionedDeserializers<T>;
}

export abstract class Versioned {
  public static BRAND: string;

  public static VERSION: VersionTuple;

  private static getVersionHandler: VersionHandler;
}

export class VersionedParser {
  private static VERSION_PART_LENGTH = 2; // bytes
  private static BRAND_LENGTH = 4;
  private static HEADER_LENGTH =
    2 * VersionedParser.VERSION_PART_LENGTH + VersionedParser.BRAND_LENGTH;

  public static encodeHeader(
    brand: string,
    [major, minor]: VersionTuple
  ): Uint8Array {
    const majorBytes = numberToBytes(
      major,
      VersionedParser.VERSION_PART_LENGTH
    );
    const minorBytes = numberToBytes(
      minor,
      VersionedParser.VERSION_PART_LENGTH
    );
    return new Uint8Array([...toBytes(brand), ...majorBytes, ...minorBytes]);
  }

  public static fromVersionedBytes<T extends Versioned>(
    handler: VersionHandler,
    bytes: Uint8Array
  ): T {
    const { brand, version } = handler;
    const [_actualBrand, actualVersion, payload] = this.parseHeader(
      brand,
      bytes
    );
    const selectedVersion = this.resolveVersion(version, actualVersion);
    const deserializer = this.getDeserializer(handler, selectedVersion);
    return deserializer(payload);
  }

  private static parseHeader(
    brand: string,
    bytes: Uint8Array
  ): [string, VersionTuple, Uint8Array] {
    if (bytes.length < VersionedParser.HEADER_LENGTH) {
      throw new Error('Invalid header length');
    }
    const [actualBrand, remainder1] = this.parseBrand(brand, bytes);
    const [actualVersion, remainder2] = this.parseVersion(remainder1);
    return [actualBrand, actualVersion, remainder2];
  }

  private static parseBrand(
    brand: string,
    bytes: Uint8Array
  ): [string, Uint8Array] {
    const [brandBytes, remainder] = split(bytes, VersionedParser.BRAND_LENGTH);
    const actualBrand = fromBytes(brandBytes);
    if (actualBrand !== brand) {
      throw new Error(`Invalid brand. Expected ${brand}, got ${actualBrand}`);
    }
    return [actualBrand, remainder];
  }

  private static parseVersion(bytes: Uint8Array): [VersionTuple, Uint8Array] {
    const [majorBytes, remainder1] = split(
      bytes,
      VersionedParser.VERSION_PART_LENGTH
    );
    const [minorBytes, remainder2] = split(
      remainder1,
      VersionedParser.VERSION_PART_LENGTH
    );
    const major = toNumber(majorBytes, false); // Is big-endian
    const minor = toNumber(minorBytes, false); // Is big-endian
    return [[major, minor], remainder2];
  }

  private static resolveVersion(
    version: VersionTuple,
    actualVersion: VersionTuple
  ): VersionTuple {
    const [latestMajor, latestMinor] = version;
    const [major, minor] = actualVersion;
    if (major !== latestMajor) {
      throw new Error(
        `Incompatible versions. Compatible version is ${latestMajor}.x, got ${major}.${minor}`
      );
    }
    // Enforce minor version compatibility.
    // Pass future minor versions to the latest minor handler.
    if (minor >= latestMinor) {
      return actualVersion;
    }
    return [major, minor];
  }

  private static getDeserializer<T extends Versioned>(
    self: VersionHandler,
    version: VersionTuple
  ): Deserializer {
    const [major, minor] = version;
    const maybeOldMajor = self.oldVersionDeserializers()[major];
    const maybeOldMinor = maybeOldMajor ? maybeOldMajor[minor] : undefined;
    if (maybeOldMinor) {
      return maybeOldMinor;
    }
    return self.currentVersionDeserializer;
  }
}
