// Umbral constants
export const SIGNATURE_LENGTH = 64;
export const CAPSULE_LENGTH = 98;
export const PUBLIC_KEY_LENGTH = 33;

// TODO: Those values must be compatible with `nucypher/nucypher`
export const SIGNATURE_HEADER_HEX = {
  SIGNATURE_TO_FOLLOW: '01',
};
// TODO: There must be a smarter way to do this
export const SIGNATURE_HEADER_BYTES_LENGTH = 1;

// TODO: Move to `src/constants.ts` or `blockchain/constants.ts`
export const ETH_ADDRESS_BYTE_LENGTH = 20;
export const ETH_HASH_BYTE_LENGTH = 32;

export const UMBRAL_KEYING_MATERIAL_BYTES_LENGTH = 32;

// Policy component sizes
export const EIP712_MESSAGE_SIGNATURE_SIZE = 65;
