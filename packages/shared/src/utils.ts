import deepEqual from 'deep-equal';

export const toBytes = (str: string): Uint8Array =>
  new TextEncoder().encode(str);

export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const fromHexString = (hexString: string): Uint8Array => {
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  const matches = hexString.match(/.{1,2}/g) ?? [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
};

export const toHexString = (bytes: Uint8Array): string =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

export const fromBase64 = (str: string): Uint8Array =>
  Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

export const hexToU8Receiver = (_key: string, value: unknown) => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return fromHexString(value);
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

const u8ToHexReplacer = (_key: string, value: unknown) => {
  if (value instanceof Uint8Array) {
    return `0x${toHexString(value)}`;
  }
  return value;
};

const sortedSerializingReplacer = (_key: string, value: unknown): unknown => {
  const serializedValue = u8ToHexReplacer(_key, value);
  return sortedReplacer(_key, serializedValue);
};

export const toJSON = (obj: unknown) =>
  JSON.stringify(obj, sortedSerializingReplacer);

export const fromJSON = (json: string) => JSON.parse(json, hexToU8Receiver);

export const zip = <T, Z>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<Z>,
): ReadonlyArray<readonly [a: T, b: Z]> => a.map((k, i) => [k, b[i]]);

export const toEpoch = (date: Date) => (date.getTime() / 1000) | 0;

export const objectEquals = (a: unknown, b: unknown, strict = true): boolean =>
  deepEqual(a, b, { strict });

export const omit = (obj: Record<string, unknown>, keys: string[]) => {
  const copy = { ...obj };
  keys.forEach((key) => delete copy[key]);
  return copy;
};
