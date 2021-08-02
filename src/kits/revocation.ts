import { Signer } from 'umbral-pre';

import { PrePublishedTreasureMap, Revocation } from '../policies/collections';
import { ChecksumAddress } from '../types';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, Revocation>;

  constructor(treasureMap: PrePublishedTreasureMap, signer: Signer) {
    this.revocations = {};
    Object.entries(treasureMap.destinations).forEach(([nodeId, arrangementId]) => {
      this.revocations[nodeId] = new Revocation(arrangementId, signer);
    });
  }
}
