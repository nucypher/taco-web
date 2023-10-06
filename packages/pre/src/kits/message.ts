import {
  Capsule,
  MessageKit,
  PublicKey,
  RetrievalKit,
  SecretKey,
} from '@nucypher/nucypher-core';
import { ChecksumAddress } from '@nucypher/shared';

import { RetrievalResult } from './retrieval';

export class PolicyMessageKit {
  constructor(
    public readonly policyEncryptingKey: PublicKey,
    private readonly threshold: number,
    private readonly result: RetrievalResult,
    private readonly messageKit: MessageKit,
  ) {}

  public static fromMessageKit(
    messageKit: MessageKit,
    policyEncryptingKey: PublicKey,
    threshold: number,
  ): PolicyMessageKit {
    return new PolicyMessageKit(
      policyEncryptingKey,
      threshold,
      RetrievalResult.empty(),
      messageKit,
    );
  }

  public get capsule(): Capsule {
    return this.messageKit.capsule;
  }

  public decryptReencrypted(
    secretKey: SecretKey,
    policyEncryptingKey: PublicKey,
  ): Uint8Array {
    const cFrags = Object.values(this.result.cFrags);
    if (!cFrags) {
      throw Error('Failed to attach any capsule fragments.');
    }

    return this.messageKit.decryptReencrypted(
      secretKey,
      policyEncryptingKey,
      cFrags,
    );
  }

  public asRetrievalKit(): RetrievalKit {
    return RetrievalKit.fromMessageKit(this.messageKit);
  }

  public isDecryptableByReceiver(): boolean {
    return (
      !!this.result.cFrags &&
      Object.keys(this.result.cFrags).length >= this.threshold
    );
  }

  public get errors(): Record<ChecksumAddress, string> {
    return this.result.errors;
  }

  public toBytes(): Uint8Array {
    return this.messageKit.toBytes();
  }

  public withResult(result: RetrievalResult): PolicyMessageKit {
    return new PolicyMessageKit(
      this.policyEncryptingKey,
      this.threshold,
      result,
      this.messageKit,
    );
  }
}
