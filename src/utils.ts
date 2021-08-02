export const fromBytes = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

export const toBytes = (str: string): Uint8Array => new TextEncoder().encode(str);

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
  first.length === second.length && first.every((value, index) => value === second[index]);

export const periodToEpoch = (period: number, secondsPerPeriod: number): number =>
  period * secondsPerPeriod * 1000;

export const epochToPeriod = (epoch: number, secondsPerPeriod: number): number =>
  Math.floor(epoch / secondsPerPeriod);

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
  const targetDate = new Date(now.getTime() - secondsPerPeriod * deltaPeriods * 1000);
  return targetDate;
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

export const merge = (A: Record<string, any>, B: Record<string, any>) => {
  const res: Record<string, any> = {};
  Object.keys({ ...A, ...B }).map((key) => {
    res[key] = B[key] || A[key];
  });
  return res;
};
