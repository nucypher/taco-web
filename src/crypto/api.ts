import sha3 from 'js-sha3';

import { fromHexString } from '../utils';

export const keccakDigest = (m: Uint8Array): Uint8Array =>
  fromHexString(sha3.keccak_256(m)).slice(0, 32);
