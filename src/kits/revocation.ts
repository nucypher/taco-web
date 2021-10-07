import { Signer } from 'umbral-pre';

import { RevocationOrder, TreasureMap } from '../policies/collections';
import { ChecksumAddress } from '../types';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, RevocationOrder>;

  constructor(treasureMap: TreasureMap, signer: Signer) {
    this.revocations = {};
    Object.entries(treasureMap.destinations).forEach(
      ([nodeId, encryptedKFrag]) => {
        this.revocations[nodeId] = new RevocationOrder(
          nodeId,
          encryptedKFrag,
          signer
        );
      }
    );
  }
}
