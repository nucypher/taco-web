import { RevocationOrder, Signer, TreasureMap } from '@nucypher/nucypher-core';

export class RevocationKit {
  public readonly revocationOrders: readonly RevocationOrder | null;

  constructor(treasureMap: TreasureMap, signer: Signer) {
    this.revocationOrders = treasureMap.makeRevocationOrders(signer);
  }
}
