import { toHexString } from '@nucypher/shared';

const customTypeReplacer = (_key: string, value: unknown) => {
  if (value instanceof Uint8Array) {
    // use hex string for byte arrays
    return `0x${toHexString(value)}`;
  }
  if (typeof value === 'bigint') {
    if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
      // can't serialized to a safe number so use bigint string notation
      return `${value}n`;
    }

    return Number(value);
  }
  return value;
};

const customTypeReceiver = (_key: string, value: unknown) => {
  if (typeof value === 'string') {
    if (/^-?\d+n$/.test(value)) {
      // bigint number stored as string (`${value}n`)
      return BigInt(value.slice(0, -1));
    }
    // NOTE: hex strings remain hex strings - could be an address (not bytes) or hex string (originally a byte array). Can't be sure which is which other than length (42) which feels flimsy
  }
  return value;
};

const sortedReplacer = (_key: string, value: unknown) => {
  if (value instanceof Object && !(value instanceof Array)) {
    return Object.keys(value)
      .sort()
      .reduce((sorted: Record<string, unknown>, key) => {
        sorted[key] = (value as Record<string, unknown>)[key];
        return sorted;
      }, {});
  }

  return value;
};

const sortedSerializingReplacer = (_key: string, value: unknown): unknown => {
  const serializedValue = customTypeReplacer(_key, value);
  return sortedReplacer(_key, serializedValue);
};

export const toJSON = (obj: unknown) =>
  JSON.stringify(obj, sortedSerializingReplacer);

export const fromJSON = (json: string) => JSON.parse(json, customTypeReceiver);
