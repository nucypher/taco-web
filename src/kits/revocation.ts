import { RevocationOrder, Signer, TreasureMap } from '@nucypher/nucypher-core';

export class RevocationKit {
  public revocationOrders: RevocationOrder[];

  constructor(treasureMap: TreasureMap, signer: Signer) {
    this.revocationOrders = treasureMap.makeRevocationOrders(signer);
  }
}
