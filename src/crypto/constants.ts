export const HRAC_LENGTH = 16;
export const SIGNATURE_LENGTH = 64;

// TODO: Those values must be compatible with `nucypher/nucypher`
export const SIGNATURE_HEADER_HEX = {
  NOT_SIGNED: '00',
  SIGNATURE_TO_FOLLOW: '01',
  SIGNATURE_IS_ON_CIPHERTEXT: '02',
};
// TODO: There must be a smarter way to do this
export const SIGNATURE_HEADER_BYTES_LENGTH = 1;

// TODO: Move to `src/constants.ts` or `blockchain/constants.ts`
export const ETH_ADDRESS_STRING_PREFIX = '0x';
export const ETH_ADDRESS_BYTE_LENGTH = 20;
export const ETH_HASH_BYTE_LENGTH = 32;

export const UMBRAL_KEYING_MATERIAL_BYTES_LENGTH = 32;

// Policy component sizes
export const EIP712_MESSAGE_SIGNATURE_SIZE = 65;
