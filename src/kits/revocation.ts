import { RevocationOrder, Signer, TreasureMap } from '@nucypher/nucypher-core';

import { ChecksumAddress } from '../types';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, RevocationOrder>;

  constructor(treasureMap: TreasureMap, signer: Signer) {
    const revocationOrders = treasureMap.makeRevocationOrders(signer);
    this.revocations = Object.fromEntries(
      revocationOrders.map((order: RevocationOrder) => [
        order.stakerAddress,
        order,
      ])
    );
  }
}
