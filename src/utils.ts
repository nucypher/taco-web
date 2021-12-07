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

export const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('base64');

export const fromBase64 = (str: string): Uint8Array =>
  Buffer.from(str, 'base64');

export const toUtf8 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString('utf-8');

export const fromUtf8 = (str: string): Uint8Array => Buffer.from(str, 'utf-8');

export const toNumber = (bytes: Uint8Array, littleEndian = true): number => {
  const view = new DataView(bytes.buffer, 0);
  switch (bytes.length) {
    case 2:
      return view.getUint16(0, littleEndian);
    case 4:
      return view.getUint32(0, littleEndian);
    default:
      throw Error(`Invalid bytes length: ${bytes.length}`);
  }
};

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export const split = (
  bytes: Uint8Array,
  size: number
): [Uint8Array, Uint8Array] => {
  if (size > bytes.length) {
    throw Error(`Index out of bounds: ${size}`);
  }
  return [bytes.slice(0, size), bytes.slice(size, bytes.length)];
};

export const periodToEpoch = (
  period: number,
  secondsPerPeriod: number
): number => period * secondsPerPeriod * 1000;

export const epochToPeriod = (
  epoch: number,
  secondsPerPeriod: number
): number => Math.floor(epoch / secondsPerPeriod);

export const dateToPeriod = (date: Date, secondsPerPeriod: number): number =>
  epochToPeriod(date.getTime() * 1000, secondsPerPeriod);

/**
 * Returns the Date object at a given period, future, or past.
 * If startOfPeriod, the Date object represents the first second of said period.
 * @param period
 * @param secondsPerPeriod
 * @param startOfPeriod
 */
export const dateAtPeriod = (
  period: number,
  secondsPerPeriod: number,
  startOfPeriod: boolean
): Date => {
  if (startOfPeriod) {
    const atStartOfPeriod = periodToEpoch(period, secondsPerPeriod);
    return new Date(atStartOfPeriod);
  }
  const now = new Date(Date.now());
  const currentPeriod = dateToPeriod(now, secondsPerPeriod);
  const deltaPeriods = period - currentPeriod;
  return new Date(now.getTime() - secondsPerPeriod * deltaPeriods * 1000);
};

/**
 * Takes a future Date object and calculates the duration from now, returning in number of periods
 * @param futureDate
 * @param secondsPerPeriod
 * @param now
 * @returns
 */
export const calculatePeriodDuration = (
  futureDate: Date,
  secondsPerPeriod: number,
  now?: Date
): number => {
  if (!now) {
    now = new Date(Date.now());
  }
  const futurePeriod = dateToPeriod(futureDate, secondsPerPeriod);
  const currentPeriod = dateToPeriod(now, secondsPerPeriod);
  return futurePeriod - currentPeriod;
};

export const mergeWithoutUndefined = (
  A: Record<string, any>,
  B: Record<string, any>
) => {
  const res: Record<string, any> = {};
  Object.keys({ ...A, ...B }).map((key) => {
    res[key] = B[key] || A[key];
  });
  return res;
};

export const bytesArray = (n: number): Uint8Array => {
  const bytes = [];
  bytes.unshift(n & 255);
  while (n >= 256) {
    n = n >>> 8;
    bytes.unshift(n & 255);
  }
  return new Uint8Array(bytes.reverse());
};

export const numberToBytes = (n: number, size: number): Uint8Array => {
  const asBytes = new Uint8Array(size);
  asBytes.set(bytesArray(n));
  asBytes.reverse(); // Ensure encoding is big-endian
  return asBytes;
};

const VARIABLE_HEADER_LENGTH = 4;
export const encodeVariableLengthMessage = (message: Uint8Array) => {
  const maxMessageLength = 256 ** VARIABLE_HEADER_LENGTH - 1;
  if (message.length > maxMessageLength) {
    throw new Error(
      `Your message is too long. The max length is ${maxMessageLength} bytes; yours is ${message.length}`
    );
  }
  const messageLengthAsBytes = numberToBytes(
    message.length,
    VARIABLE_HEADER_LENGTH
  );
  return new Uint8Array([...messageLengthAsBytes, ...message]);
};

export const decodeVariableLengthMessage = (
  bytes: Uint8Array
): [Uint8Array, Uint8Array] => {
  const [header, remainder1] = split(bytes, VARIABLE_HEADER_LENGTH);
  const messageLength = toNumber(header, false); // Is big-endian
  const [message, remainder2] = split(remainder1, messageLength);
  return [message, remainder2];
};

export const zip = (a: Array<any>, b: Array<any>) => a.map((k, i) => [k, b[i]]);
