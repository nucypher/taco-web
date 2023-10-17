import { VerifiedCapsuleFrag } from '@nucypher/nucypher-core';
import { ChecksumAddress } from '@nucypher/shared';

export class RetrievalResult {
  constructor(
    public readonly cFrags: Record<ChecksumAddress, VerifiedCapsuleFrag> = {},
    public readonly errors: Record<ChecksumAddress, string> = {},
  ) {}

  public static empty(): RetrievalResult {
    return new RetrievalResult();
  }

  public get addresses(): readonly ChecksumAddress[] {
    return Object.keys(this.cFrags) as ChecksumAddress[];
  }

  public withResult(result: RetrievalResult): RetrievalResult {
    const cFrags = Object.assign(this.cFrags, result.cFrags);
    return new RetrievalResult(cFrags);
  }
}
