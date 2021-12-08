import { keccakDigest } from '../crypto/api';
import { toBytes } from '../utils';

export class HRAC {
  public static readonly BYTE_LENGTH: number = 16;

  constructor(private readonly bytes: Uint8Array) {
    if (bytes.length !== HRAC.BYTE_LENGTH)
      throw new Error(
        `Incorrect HRAC byte length: expected ${HRAC.BYTE_LENGTH}, received: ${bytes.length}`
      );
    this.bytes = bytes;
  }

  public static derive(
    publisherVerifyingKey: Uint8Array,
    bobVerifyingKey: Uint8Array,
    label: string
  ): HRAC {
    const hrac = keccakDigest(
      new Uint8Array([
        ...publisherVerifyingKey,
        ...bobVerifyingKey,
        ...fromUtf8(label),
      ])
    ).slice(0, HRAC.BYTE_LENGTH);
    return new HRAC(hrac);
  }

  public toBytes(): Uint8Array {
    return this.bytes;
  }
}
