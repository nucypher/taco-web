import {
  TimeCondition,
  TimeConditionProps,
} from '../../../../src/conditions/base';
import { ReturnValueTestProps } from '../../../../src/conditions/base/shared';
import { timeConditionSchema } from '../../../../src/conditions/base/time';

describe('validation', () => {
  const returnValueTest: ReturnValueTestProps = {
    index: 0,
    comparator: '>',
    value: '100',
  };

  it('accepts a valid schema', () => {
    const conditionObj: TimeConditionProps = {
      returnValueTest,
      conditionType: 'time',
      method: 'blocktime',
      chain: 1,
    };
    const result = TimeCondition.validate(timeConditionSchema, conditionObj);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(conditionObj);
  });

  it('rejects an invalid schema', () => {
    const badObj = {
      conditionType: 'time',
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
