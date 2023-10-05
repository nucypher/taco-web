import { expect, test } from 'vitest';

import {
  TimeCondition,
  TimeConditionProps,
} from '../../../../src/conditions/base';
import { ReturnValueTestProps } from '../../../../src/conditions/base/shared';
import {
  TimeConditionMethod,
  timeConditionSchema,
  TimeConditionType,
} from '../../../../src/conditions/base/time';

test('validation', () => {
  const returnValueTest: ReturnValueTestProps = {
    index: 0,
    comparator: '>',
    value: '100',
  };

  test('accepts a valid schema', () => {
    const conditionObj: TimeConditionProps = {
      conditionType: TimeConditionType,
      returnValueTest,
      method: TimeConditionMethod,
      chain: 1,
    };
    const result = TimeCondition.validate(timeConditionSchema, conditionObj);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(conditionObj);
  });

  test('rejects an invalid schema', () => {
    const badObj = {
      conditionType: TimeConditionType,
      // Intentionally replacing `returnValueTest` with an invalid test
      returnValueTest: {
        ...returnValueTest,
        comparator: 'not-a-comparator',
      },
      chain: 5,
    } as unknown as TimeConditionProps;
    const result = TimeCondition.validate(timeConditionSchema, badObj);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      returnValueTest: {
        comparator: {
          _errors: [
            "Invalid enum value. Expected '==' | '>' | '<' | '>=' | '<=' | '!=', received 'not-a-comparator'",
          ],
        },
      },
    });
  });
});
