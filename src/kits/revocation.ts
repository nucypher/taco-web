import { Signer } from 'umbral-pre';

import { Revocation, TreasureMap } from '../policies/collections';
import { ChecksumAddress } from '../types';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, Revocation>;

  constructor(treasureMap: TreasureMap, signer: Signer) {
    this.revocations = {};
    Object.entries(treasureMap.destinations).forEach(
      ([nodeId, encryptedKFrag]) => {
        this.revocations[nodeId] = new Revocation(
          nodeId,
          encryptedKFrag,
          signer
        );
      }
    );
  }
}
