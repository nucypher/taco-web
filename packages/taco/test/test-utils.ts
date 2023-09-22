// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { SessionStaticSecret } from '@nucypher/nucypher-core';
import { SpyInstance, vi } from 'vitest';

import { ThresholdDecrypter } from '../src';

export const mockRandomSessionStaticSecret = (
  secret: SessionStaticSecret,
): SpyInstance => {
  return vi
    .spyOn(ThresholdDecrypter.prototype as any, 'makeSessionKey')
    .mockImplementation(() => secret);
};
