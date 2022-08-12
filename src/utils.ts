import { sha256 as _sha256 } from '@ethersproject/sha2';
import { keccak256 } from '@ethersproject/solidity';
import { toUtf8Bytes } from '@ethersproject/strings';
import { formatBytes32String } from '@ethersproject/strings';

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

const periodToEpoch = (period: number, secondsPerPeriod: number): number =>
  period * secondsPerPeriod * 1000;

const epochToPeriod = (epoch: number, secondsPerPeriod: number): number =>
  Math.floor(epoch / secondsPerPeriod);

const dateToPeriod = (date: Date, secondsPerPeriod: number): number =>
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

export const zip = (a: Array<any>, b: Array<any>) => a.map((k, i) => [k, b[i]]);

export const toEpoch = (date: Date) => (date.getTime() / 1000) | 0;

// Reference: https://github.com/semaphore-protocol/semaphore.js/blob/c99af703eff08fa7f3e133b9e139bf3feca5dce5/packages/identity/src/utils.ts#L11
/**
 * Returns an hexadecimal sha256 hash of the message passed as parameter.
 * @param message The string to hash.
 * @returns The hexadecimal hash of the message.
 */
export const sha256 = (message: string): string =>
  _sha256(toUtf8Bytes(message));

// Reference: https://github.com/semaphore-protocol/semaphore.js/blob/45cd485110f638c083e070dcbe1cc15863b2c78c/packages/proof/src/generateSignalHash.ts
/**
 * Hashes a signal string with Keccak256.
 * @param signal The Semaphore signal.
 * @returns The signal hash.
 */
export default function generateSignalHash(signal: string): bigint {
  return (
    BigInt(keccak256(['bytes32'], [formatBytes32String(signal)])) >> BigInt(8)
  );
}
