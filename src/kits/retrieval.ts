import { VerifiedCapsuleFrag } from 'umbral-pre';

import { toCanonicalAddress } from '../crypto/utils';
import { ChecksumAddress } from '../types';

export class RetrievalResult {
  public readonly cFrags: Record<ChecksumAddress, VerifiedCapsuleFrag>;

  constructor(cFrags?: Record<ChecksumAddress, VerifiedCapsuleFrag>) {
    this.cFrags = cFrags ? cFrags : {};
  }

  public static empty(): RetrievalResult {
    return new RetrievalResult();
  }

  public get addresses(): ChecksumAddress[] {
    return Object.keys(this.cFrags);
  }

  public withResult(result: RetrievalResult): RetrievalResult {
    const cFrags = Object.assign(this.cFrags, result.cFrags);
    return new RetrievalResult(cFrags);
  }
}

export class RetrievalKit {
  constructor(
    public capsule: VerifiedCapsuleFrag,
    public queriedAddresses: ChecksumAddress[]
  ) {}

  toBytes(): Uint8Array {
    return new Uint8Array([
      ...this.capsule.toBytes(),
      ...this.queriedAddresses
        .map(toCanonicalAddress)
        .reduce(
          (previous, next) => new Uint8Array([...previous, ...next]),
          new Uint8Array()
        ),
    ]);
  }
}
