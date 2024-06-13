import {TEST_USER_ADDRESS} from "@nucypher/test-utils";
import {describe, expect, it} from 'vitest';

import {
  EIP712AuthCondition,
  EIP712AuthConditionSchema,
  EIP712AuthConditionType
} from "../../../src/conditions/auth/eip712";

describe('validation', () => {
  const testEIP712AuthConditionObj = {
    conditionType: 'auth/eip712',
    parameters: TEST_USER_ADDRESS,
  };

  it('accepts on a valid schema', () => {
    const result = EIP712AuthCondition.validate(
      EIP712AuthConditionSchema,
      testEIP712AuthConditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(testEIP712AuthConditionObj);
  });

  it('rejects an invalid schema', () => {
    const badCondObj = {
      ...testEIP712AuthConditionObj,
      // Intentionally replacing `parameters` with invalid parameters
      parameters: undefined
    } as unknown as typeof testEIP712AuthConditionObj;

    const result = EIP712AuthCondition.validate(EIP712AuthConditionSchema, badCondObj);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      parameters: {
        _errors: [
          "Required", "Required",
        ],
      },
    });
  });

  it('infers condition type from constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {conditionType, ...withoutType} = testEIP712AuthConditionObj;
    const condition = new EIP712AuthCondition(testEIP712AuthConditionObj);
    expect(condition.value.conditionType).toEqual(EIP712AuthConditionType);
  });

  describe('parameters', () => {
    it('accepts a single address', () => {
      const result = EIP712AuthCondition.validate(EIP712AuthConditionSchema, {
        ...testEIP712AuthConditionObj,
        parameters: TEST_USER_ADDRESS,
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testEIP712AuthConditionObj,
        parameters: TEST_USER_ADDRESS,
      });
    });
  });
});
