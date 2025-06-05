import { describe, expect, it } from 'vitest';

import {
  WalletAllowlistCondition,
  WalletAllowlistConditionProps,
} from '../../../src/conditions/base/wallet-allowlist';
import {
  walletAllowlistConditionSchema,
  WalletAllowlistConditionType,
} from '../../../src/conditions/schemas/wallet-allowlist';
import { testWalletAllowlistConditionObj } from '../../test-utils';

describe('WalletAllowlistCondition', () => {
  describe('validate', () => {
    it('accepts valid condition object', () => {
      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        testWalletAllowlistConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testWalletAllowlistConditionObj);
    });

    it('fills in conditionType if missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType: _, ...withoutType } =
        testWalletAllowlistConditionObj;
      const condition = new WalletAllowlistCondition(withoutType);

      expect(condition.toObj().conditionType).toBe(
        WalletAllowlistConditionType,
      );
    });

    it('rejects unknown fields', () => {
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        unknownField: 'unknown',
      } as unknown as WalletAllowlistConditionProps;

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      // The error format for unknown fields is just a top-level _errors array
      expect(result.error?.format()).toMatchObject({
        _errors: ["Unrecognized key(s) in object: 'unknownField'"],
      });
    });

    it('rejects empty addresses array', () => {
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses: [],
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        addresses: {
          _errors: ['At least one address must be provided'],
        },
      });
    });

    it('rejects too many addresses (more than 25)', () => {
      const tooManyAddresses = Array(26).fill(
        '0x1234567890123456789012345678901234567890',
      );
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses: tooManyAddresses,
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        addresses: {
          _errors: ['Maximum of 25 addresses allowed'],
        },
      });
    });

    it('accepts single address', () => {
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses: ['0x1234567890123456789012345678901234567890'],
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
    });

    it('checks for valid ethereum addresses', () => {
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses: ['not-an-ethereum-address'],
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        addresses: {
          0: {
            _errors: ['Invalid Ethereum address'],
          },
        },
      });
    });

    it('rejects non-array addresses', () => {
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses: 'single-address' as unknown as string[],
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        addresses: {
          _errors: ['Expected array, received string'],
        },
      });
    });

    it('rejects non-checksummed addresses', () => {
      // This is a valid address but with mixed case that doesn't match checksum format
      // 0xE247A45c287191d435A8a5D72A7C8dc030451E9F (correct checksum)
      // vs
      // 0xe247a45c287191d435A8a5D72A7C8dc030451E9F (incorrect checksum)
      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        // Mixed case that doesn't follow checksum format
        addresses: ['0xe247a45c287191d435A8a5D72A7C8dc030451E9F'],
      };

      const result = WalletAllowlistCondition.validate(
        walletAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        addresses: {
          _errors: ['All addresses must be properly checksummed'],
        },
      });
    });
  });

  describe('constructor', () => {
    it('creates a condition from a valid object', () => {
      const condition = new WalletAllowlistCondition(
        testWalletAllowlistConditionObj,
      );
      expect(condition).toBeDefined();
    });

    it('fails to create a condition from an invalid object', () => {
      const invalidCondition = () => {
        // This will throw at runtime when validation occurs
        return new WalletAllowlistCondition({
          ...testWalletAllowlistConditionObj,
          addresses: [] as string[], // Empty array will fail validation
        });
      };

      // The error is wrapped in a general Error with message containing the Zod validation error
      expect(invalidCondition).toThrow(/Invalid condition/);
    });

    it('retains the original addresses order', () => {
      const addresses = [
        '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
      ];

      const conditionObj = {
        ...testWalletAllowlistConditionObj,
        addresses,
      };
      const condition = new WalletAllowlistCondition(conditionObj);

      expect(condition.toObj().addresses).toEqual(addresses);
    });
  });

  describe('requiresAuthentication', () => {
    it('returns true', () => {
      const condition = new WalletAllowlistCondition(
        testWalletAllowlistConditionObj,
      );
      expect(condition.requiresAuthentication()).toBe(true);
    });
  });
});
