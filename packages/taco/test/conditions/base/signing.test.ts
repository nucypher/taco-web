import { describe, expect, it } from 'vitest';

import {
  SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
  SigningObjectAbiAttributeCondition,
  signingObjectAbiAttributeConditionSchema,
  SigningObjectAbiAttributeConditionType,
  SigningObjectAttributeCondition,
  signingObjectAttributeConditionSchema,
  SigningObjectAttributeConditionType,
} from '../../../src/conditions/base/signing';
import {
  testSigningAttributeConditionObj,
  testSigningObjectAbiAttributeConditionObj,
} from '../../test-utils';

describe('SigningObjectAttributeCondition', () => {
  describe('validation', () => {
    it('accepts on a valid schema', () => {
      const result = SigningObjectAttributeCondition.validate(
        signingObjectAttributeConditionSchema,
        testSigningAttributeConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testSigningAttributeConditionObj);
    });

    describe('rejects an invalid schema', () => {
      it('rejects invalid condition type', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          conditionType: 'myAttribute',
        };
        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          conditionType: {
            _errors: ['Invalid literal value, expected "attribute"'],
          },
        });
      });
      it('rejects invalid context variable', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          signingObjectContextVar: ':contextVar',
        };
        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          signingObjectContextVar: {
            _errors: [
              'Invalid literal value, expected ":signingConditionObject"',
            ],
          },
        });
      });
      it('rejects empty attributeName', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: '',
        };

        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          attributeName: {
            _errors: ['String must contain at least 1 character(s)'],
          },
        });
      });
      it('rejects invalid attributeName value type', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: 100,
        };

        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          attributeName: {
            _errors: ['Expected string, received number'],
          },
        });
      });
    });

    it('infers condition type from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, ...withoutType } =
        testSigningAttributeConditionObj;
      const condition = new SigningObjectAttributeCondition(withoutType);
      expect(condition.value.conditionType).toEqual(
        SigningObjectAttributeConditionType,
      );
    });
    it('infers context variable from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, signingObjectContextVar, ...withoutType } =
        testSigningAttributeConditionObj;
      const condition = new SigningObjectAttributeCondition(withoutType);
      expect(condition.value.signingObjectContextVar).toEqual(
        SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
      );
    });
  });
});

describe('SigningObjectAbiAttributeCondition', () => {
  describe('validation', () => {
    it('accepts on a valid schema', () => {
      const result = SigningObjectAbiAttributeCondition.validate(
        signingObjectAbiAttributeConditionSchema,
        testSigningObjectAbiAttributeConditionObj,
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testSigningObjectAbiAttributeConditionObj);
    });

    describe('rejects an invalid schema', () => {
      it('rejects invalid condition type', () => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          conditionType: 'myAttribute',
        };
        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          conditionType: {
            _errors: ['Invalid literal value, expected "abi-attribute"'],
          },
        });
      });
      it('rejects invalid context variable', () => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          signingObjectContextVar: ':contextVar',
        };
        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          signingObjectContextVar: {
            _errors: [
              'Invalid literal value, expected ":signingConditionObject"',
            ],
          },
        });
      });
      it('rejects empty attributeName', () => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: '',
        };

        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          attributeName: {
            _errors: ['String must contain at least 1 character(s)'],
          },
        });
      });
      it('rejects invalid attributeName value type', () => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: 100,
        };

        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          attributeName: {
            _errors: ['Expected string, received number'],
          },
        });
      });
      it.each([
        'transfer(address,uint256)',
        'approve(address,uint256)',
        'transferFrom(address,address,uint256)',
        'mint(address,uint256)',
        'burn(uint256)',
        'baseTypes(bool,address,bytes,string)',
        'intTypes(int256,int128,int64,int32,int16,int8)',
        'uintTypes(uint208,uint176,uint128,uint48,uint40,uint24)',
        'bytesTypes(bytes1,bytes32,bytes32,bytes29,bytes7)',
        'otherTypes(uint256,uint128,int32,int8,bytes1,bytes24)',
        'tupleType((string,uint256,address))',
        'arrayType(uint256[],address[])',
        'tupleArrayType((string,int256,address)[])',
        'nestedTupleType(address,(string,uint256,(address,bool)))',
      ])('accepts valid abi call signatures', (validAbiCallSignature) => {
        const validSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          abiValidation: {
            allowedAbiCalls: {
              [validAbiCallSignature]: [],
            },
          },
        };
        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          validSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
      });
      it.each([
        'invalidSignature',
        'mint(address, uint256)', // no spaces
        '123start(address,uint256)', // invalid function name
        '!start(address,uint256)', // invalid function name
        'bad(!!!, address)', // invalid parameter type
        'transfer(address,uint257)', // invalid parameter type uint257
        'intType(int23)', // invalid parameter type int23
        'uintType(uint22)', // invalid parameter type uint22
        'bytesTypes(bytes0)', // invalid bytes type
        'bytesTypes(bytes33)', // invalid bytes type
        'transfer(address,uint256', // missing closing parenthesis
        'execute(address,uint256,(address,uint256,bytes)', // mismatched paraentheses
        'function transferFrom(address from, address to, uint256 value)', // unsupported signature format
        'function transferFrom(address,address,uint256)', // unsupported signature format
        'event Transfer(address indexed from, address indexed to, address value)', // unsupported event signature
        'transfer(,uint256)', // empty parameter type
        'transfer(address,uint256) extra', // extra text after valid signature
      ])('rejects invalid abi call signatures', (invalidAbiCallSignature) => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          abiValidation: {
            allowedAbiCalls: {
              [invalidAbiCallSignature]: [],
            },
          },
        };

        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          abiValidation: {
            allowedAbiCalls: {
              [invalidAbiCallSignature]: {
                _errors: ['Invalid human readable ABI signature provided'],
              },
            },
          },
        });
      });
      it('rejects invalid abiCallValidation: both returnValueTest and nestedValidation', () => {
        const badSigningObjectAbiAttributeConditionObj = {
          ...testSigningObjectAbiAttributeConditionObj,
          abiValidation: {
            allowedAbiCalls: {
              'execute((address,uint256,bytes))': [
                {
                  parameterIndex: 0,
                  indexWithinTuple: 0,
                  returnValueTest: {
                    comparator: '==',
                    value: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
                  },
                  nestedAbiValidation: {
                    allowedAbiCalls: {
                      'transfer(address,uint256)': [],
                    },
                  },
                },
              ],
            },
          },
        };

        const result = SigningObjectAbiAttributeCondition.validate(
          signingObjectAbiAttributeConditionSchema,
          badSigningObjectAbiAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error!.format()).toMatchObject({
          abiValidation: {
            allowedAbiCalls: {
              'execute((address,uint256,bytes))': {
                '0': {
                  returnValueTest: {
                    _errors: [
                      "At most one of the fields 'returnValueTest' and 'nestedAbiValidation' must be defined",
                    ],
                  },
                },
              },
            },
          },
        });
      });
    });

    it('infers condition type from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, ...withoutType } =
        testSigningObjectAbiAttributeConditionObj;
      const condition = new SigningObjectAbiAttributeCondition(withoutType);
      expect(condition.value.conditionType).toEqual(
        SigningObjectAbiAttributeConditionType,
      );
    });
    it('infers context variable from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, signingObjectContextVar, ...withoutType } =
        testSigningObjectAbiAttributeConditionObj;
      const condition = new SigningObjectAbiAttributeCondition(withoutType);
      expect(condition.value.signingObjectContextVar).toEqual(
        SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
      );
    });
  });
});
