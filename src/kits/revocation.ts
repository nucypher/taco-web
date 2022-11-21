import { RevocationOrder, Signer, TreasureMap } from '@nucypher/nucypher-core';

export class RevocationKit {
  public revocationOrder: RevocationOrder | null;

  // ideally underlying rust should throw an error if the treasure map is not signed by the signer
  constructor(treasureMap: TreasureMap, signer: Signer) {
    this.revocationOrder = treasureMap.makeRevocationOrders(signer);
  }
}
