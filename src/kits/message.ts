import { Capsule, PublicKey, SecretKey } from '@nucypher/nucypher-core';

import { MessageKit, RetrievalKit } from '../core';

import { RetrievalResult } from './retrieval';

export class PolicyMessageKit {
  constructor(
    public policyEncryptingKey: PublicKey,
    private threshold: number,
    private result: RetrievalResult,
    private messageKit: MessageKit
  ) {}

  public static fromMessageKit(
    messageKit: MessageKit,
    policyEncryptingKey: PublicKey,
    threshold: number
  ): PolicyMessageKit {
    return new PolicyMessageKit(
      policyEncryptingKey,
      threshold,
      RetrievalResult.empty(),
      messageKit
    );
  }

  public get capsule(): Capsule {
    return this.messageKit.capsule;
  }

  public decryptReencrypted(
    secretKey: SecretKey,
    policyEncryptingKey: PublicKey
  ): Uint8Array {
    const cFrags = Object.values(this.result.cFrags);
    if (!cFrags) {
      throw 'Failed to attach any capsule fragments.';
    }

    let mk = this.messageKit.withCFrag(cFrags[0]);
    cFrags.slice(1).map((cFrag) => {
      mk = mk.withCFrag(cFrag);
    });

    return mk.decryptReencrypted(secretKey, policyEncryptingKey);
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

  public toBytes(): Uint8Array {
    return this.messageKit.toBytes();
  }

  public withResult(result: RetrievalResult): PolicyMessageKit {
    return new PolicyMessageKit(
      this.policyEncryptingKey,
      this.threshold,
      result,
      this.messageKit
    );
  }
}
