import { encodeVariableLengthMessage } from '../../src/utils';

describe('serialization', () => {
  it('encodes variable length message', () => {
    const msg = new Uint8Array([ 0, 1, 2, 3, 4, 5 ]);
    const encodedMsg = encodeVariableLengthMessage(msg);
    const expected = new Uint8Array([ ...[ 0, 0, 0, 6 ], ...msg ]);
    expect(encodedMsg).toEqual(expected);
  });
});
