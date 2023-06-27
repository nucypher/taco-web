import { DkgPublicKey } from '@nucypher/nucypher-core';

import { fromHexString } from '../../src/utils';

describe('Ritual', () => {
  it('deserializes pre-made dkg ritual', async () => {
    const pkWord1 = fromHexString(
      '9045795411ed251bf2eecc9415552c41863502a207104ef7ab482bc2364729d9'
    );
    const pkWord2 = fromHexString('b99e2949cee8d888663b2995fc647fcf');

    // We need to concat two words returned by the DKG contract
    const dkgPkBytes = new Uint8Array([...pkWord1, ...pkWord2]);
    expect(dkgPkBytes.length).toEqual(48);

    const dkgPk = DkgPublicKey.fromBytes(dkgPkBytes);
    expect(dkgPk.toBytes()).toEqual(dkgPkBytes);
  });
});
