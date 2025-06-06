import deepEqual from 'deep-equal';

// TODO: Replace byte and hex manipulation with ethers.js
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
