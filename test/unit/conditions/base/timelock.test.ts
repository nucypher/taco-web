import { TimelockCondition } from '../../../../src/conditions/base';

describe('validation', () => {
  const returnValueTest = {
    index: 0,
    comparator: '>',
    value: '100',
  };

  it('accepts a valid schema', () => {
    const timelock = new TimelockCondition({
      returnValueTest,
    });
    expect(timelock.toObj()).toEqual({
      returnValueTest,
      method: 'timelock',
    });
  });

  it('rejects an invalid schema', () => {
    const badTimelockObj = {
      // Intentionally replacing `returnValueTest` with an invalid test
      returnValueTest: {
        ...returnValueTest,
        comparator: 'not-a-comparator',
      },
    };

    const badTimelock = new TimelockCondition(badTimelockObj);
    expect(() => badTimelock.toObj()).toThrow(
      'Invalid condition: "returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
    );

    const { error } = badTimelock.validate(badTimelockObj);
    expect(error?.message).toEqual(
      '"returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
    );
  });
});
