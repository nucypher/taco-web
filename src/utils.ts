import deepEqual from 'deep-equal';

export const toBytes = (str: string): Uint8Array =>
  new TextEncoder().encode(str);

export const fromHexString = (hexString: string): Uint8Array => {
  const matches = hexString.match(/.{1,2}/g) ?? [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
};

export const toHexString = (bytes: Uint8Array): string =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64');

export const fromBase64 = (str: string): Uint8Array =>
  Buffer.from(str, 'base64');

export const base64ToU8Receiver = (_key: string, value: unknown) => {
  if (typeof value === 'string' && value.startsWith('base64:')) {
    return fromBase64(value.split('base64:')[1]);
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

const u8ToBase64Replacer = (_key: string, value: unknown) => {
  if (value instanceof Uint8Array) {
    return `base64:${toBase64(value)}`;
  }
  return value;
};

const sortedSerializingReplacer = (_key: string, value: unknown): unknown => {
  const serializedValue = u8ToBase64Replacer(_key, value);
  return sortedReplacer(_key, serializedValue);
};

export const toJson = (obj: unknown) =>
  JSON.stringify(obj, sortedSerializingReplacer);

export const fromJson = (json: string) => JSON.parse(json, base64ToU8Receiver);

export const zip = <T, Z>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<Z>
): ReadonlyArray<readonly [a: T, b: Z]> => a.map((k, i) => [k, b[i]]);

export const toEpoch = (date: Date) => (date.getTime() / 1000) | 0;

export const bytesEquals = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export const objectEquals = (a: unknown, b: unknown): boolean =>
  deepEqual(a, b, { strict: true });
