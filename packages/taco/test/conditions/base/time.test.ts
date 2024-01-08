import { ChainId } from '@nucypher/shared';
import { TEST_CHAIN_ID } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import {
  TimeCondition,
  TimeConditionMethod,
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from '../../../src/conditions/base/time';
import { ReturnValueTestProps } from '../../../src/conditions/shared';

describe('validation', () => {
  const returnValueTest: ReturnValueTestProps = {
    comparator: '>',
    value: 100,
  };

  it('accepts a valid schema', () => {
    const conditionObj: TimeConditionProps = {
      conditionType: TimeConditionType,
      returnValueTest,
      method: TimeConditionMethod,
      chain: ChainId.ETHEREUM_MAINNET,
    };
    const result = TimeCondition.validate(timeConditionSchema, conditionObj);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(conditionObj);
  });

  it('rejects an invalid schema', () => {
    const badObj = {
      conditionType: TimeConditionType,
      // Intentionally replacing `returnValueTest` with an invalid test
      returnValueTest: {
        ...returnValueTest,
        comparator: 'not-a-comparator',
      },
      chain: TEST_CHAIN_ID,
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

  it('infers condition type from constructor', () => {
    const condition = new TimeCondition({
      returnValueTest,
      method: TimeConditionMethod,
      chain: TEST_CHAIN_ID,
    });
    expect(condition.value.conditionType).toEqual(TimeConditionType);
  });

  it('rejects non-existing method', () => {
    const badObj = {
      ...returnValueTest,
      method: 'non-existing-method',
      chain: TEST_CHAIN_ID,
    } as unknown as TimeConditionProps;
    const result = TimeCondition.validate(timeConditionSchema, badObj);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      method: {
        _errors: ['Invalid literal value, expected "blocktime"'],
      },
    });
  });
});
