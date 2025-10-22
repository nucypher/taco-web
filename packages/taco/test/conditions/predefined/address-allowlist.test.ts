import { describe, expect, it } from 'vitest';

import { ContextVariableConditionType } from '../../../src/conditions/base/context-variable';
import {
  AddressAllowlistCondition,
  AddressAllowlistConditionProps,
} from '../../../src/conditions/predefined/address-allowlist';
import { addressAllowlistConditionSchema } from '../../../src/conditions/schemas/address-allowlist';
import { testAddressAllowlistConditionObj } from '../../test-utils';

describe('AddressAllowlistCondition', () => {
  describe('validate', () => {
    it('accepts valid condition object', () => {
      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        testAddressAllowlistConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testAddressAllowlistConditionObj);
    });

    it('transforms to ContextVariableCondition with correct conditionType', () => {
      const condition = new AddressAllowlistCondition(
        testAddressAllowlistConditionObj,
      );

      expect(condition.toObj().conditionType).toBe(
        ContextVariableConditionType,
      );
    });

    it('rejects unknown fields', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        unknownField: 'unknown',
      } as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      // The error format for unknown fields is just a top-level _errors array
      expect(result.error?.format()).toMatchObject({
        _errors: ['Expected array, received object'],
      });
    });

    it('requires addresses to be present', () => {
      const conditionObj =
        undefined as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        _errors: ['Required'],
      });
    });

    it('requires addresses to be an array', () => {
      const conditionObj =
        'not-an-array' as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain('Expected array');
    });

    it('requires at least one address', () => {
      const conditionObj = [] as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain(
        'At least one address must be provided',
      );
    });

    it('enforces a maximum of 25 addresses', () => {
      // Create an array of 26 valid Ethereum addresses
      const tooManyAddresses = Array(26)
        .fill(0)
        .map((_, i) => `0x${(i + 10).toString().padStart(40, '0')}`);

      const conditionObj =
        tooManyAddresses as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain(
        'A maximum of 25 addresses is allowed',
      );
    });

    it('requires addresses to be valid Ethereum addresses', () => {
      const conditionObj = [
        'not-an-eth-address',
      ] as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain('Invalid Ethereum address');
    });

    it('requires addresses to be checksummed', () => {
      const conditionObj = [
        '0x1e988ba4692e52bc50b375bcc8585b95c48aad77',
      ] as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain(
        'Invalid Ethereum address - it must be valid and checksummed',
      );
    });
  });

  describe('constructor', () => {
    it('creates a condition from a valid object', () => {
      const condition = new AddressAllowlistCondition(
        testAddressAllowlistConditionObj,
      );
      expect(condition.toObj()).toEqual({
        conditionType: 'context-variable',
        contextVariable: ':userAddress',
        returnValueTest: {
          comparator: 'in',
          value: [
            '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
            '0x0000000000000000000000000000000000000001',
            '0x0000000000000000000000000000000000000002',
          ],
        },
      });
    });

    it('throws an error for invalid condition', () => {
      const invalidCondition = () => {
        return new AddressAllowlistCondition([]);
      };

      // The error is wrapped in a general Error with message containing the Zod validation error
      expect(invalidCondition).toThrow(/Invalid condition/);
    });
  });

  describe('requiresAuthentication', () => {
    it('returns true', () => {
      const condition = new AddressAllowlistCondition(
        testAddressAllowlistConditionObj,
      );
      expect(condition.requiresAuthentication()).toBe(true);
    });
  });
});
