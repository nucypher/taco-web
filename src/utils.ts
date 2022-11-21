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

export const base64ToU8Receiver = (
  key: string,
  value: string | number | Uint8Array
) => {
  if (typeof value === 'string' && value.startsWith('base64:')) {
    return fromBase64(value.split('base64:')[1]);
  }
  return value;
};

export const u8ToBase64Replacer = (
  key: string,
  value: string | number | Uint8Array
) => {
  if (value instanceof Uint8Array) {
    return `base64:${toBase64(value)}`;
  }
  return value;
};

export const zip = <T, Z>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<Z>
): ReadonlyArray<readonly [a: T, b: Z]> => a.map((k, i) => [k, b[i]]);

export const toEpoch = (date: Date) => (date.getTime() / 1000) | 0;
