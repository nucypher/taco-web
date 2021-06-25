export const HRAC_LENGTH = 16;
export const SIGNATURE_LENGTH = 64;

// TODO: Those values must be compatible with `nucypher/nucypher`
export const SIGNATURE_HEADER = {
  NOT_SIGNED: Buffer.from([0]).toString('hex'),
  SIGNATURE_TO_FOLLOW: Buffer.from([1]).toString('hex'),
  SIGNATURE_IS_ON_CIPHERTEXT: Buffer.from([2]).toString('hex'),
};

// TODO: There must be a smarter way to do this
export const SIGNATURE_HEADER_LENGTH = 1;

// TODO: Move to `src/constants.ts` or `blockchain/constants.ts`
export const ETH_ADDRESS_STRING_PREFIX = '0x';
export const ETH_ADDRESS_BYTE_LENGTH = 20;
export const ETH_HASH_BYTE_LENGTH = 32;
