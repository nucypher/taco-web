export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const toBytes = (str: string): Uint8Array =>
  new TextEncoder().encode(str);

export const fromHexString = (hexString: string): Uint8Array => {
  const matches = hexString.match(/.{1,2}/g) ?? [];
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
};

export const toHexString = (bytes: Uint8Array): string =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

// TODO: Use typed arrays instead of btoa
export const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode.apply(null, [...bytes]));

// TODO: Use typed arrays instead of atob
export const fromBase64 = (str: string): Uint8Array =>
  new Uint8Array([
    ...atob(str)
      .split('')
      .map(function (c) {
        return c.charCodeAt(0);
      }),
  ]);

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);
