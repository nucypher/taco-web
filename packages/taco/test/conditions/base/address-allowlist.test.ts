import { describe, expect, it } from 'vitest';

import {
  AddressAllowlistCondition,
  AddressAllowlistConditionProps,
} from '../../../src/conditions/base/address-allowlist';
import {
  addressAllowlistConditionSchema,
  AddressAllowlistConditionType,
} from '../../../src/conditions/schemas/address-allowlist';
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

    it('fills in conditionType if missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType: _, ...withoutType } =
        testAddressAllowlistConditionObj;
      const condition = new AddressAllowlistCondition(withoutType);

      expect(condition.toObj().conditionType).toBe(
        AddressAllowlistConditionType,
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
        _errors: ["Unrecognized key(s) in object: 'unknownField'"],
      });
    });

    it('requires addresses to be present', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        addresses: undefined,
      } as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toHaveProperty('addresses');
    });

    it('requires addresses to be an array', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        addresses: 'not-an-array',
      } as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain('Expected array');
    });

    it('requires at least one address', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        addresses: [],
      } as unknown as AddressAllowlistConditionProps;

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

    it('requires addresses to be valid Ethereum addresses', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        addresses: ['not-an-eth-address'],
      } as unknown as AddressAllowlistConditionProps;

      const result = AddressAllowlistCondition.validate(
        addressAllowlistConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain('Invalid Ethereum address');
    });

    it('requires addresses to be checksummed', () => {
      const conditionObj = {
        ...testAddressAllowlistConditionObj,
        // Lowercase version of a valid address
        addresses: ['0x1e988ba4692e52bc50b375bcc8585b95c48aad77'],
      } as unknown as AddressAllowlistConditionProps;

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
      expect(condition.toObj()).toEqual(testAddressAllowlistConditionObj);
    });

    it('throws an error for invalid condition', () => {
      const invalidCondition = () => {
        return new AddressAllowlistCondition({
          userAddress: ':userAddress',
          addresses: [],
        });
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
