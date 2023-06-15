import { TimeCondition } from '../../../../src/conditions/base';

describe('validation', () => {
  const returnValueTest = {
    index: 0,
    comparator: '>',
    value: '100',
  };

  it('accepts a valid schema', () => {
    const timeCondition = new TimeCondition({
      returnValueTest,
      chain: 5,
    });
    expect(timeCondition.toObj()).toEqual({
      returnValueTest,
      chain: 5,
      method: 'blocktime',
    });
  });

  it('rejects an invalid schema', () => {
    const badTimeObj = {
      // Intentionally replacing `returnValueTest` with an invalid test
      returnValueTest: {
        ...returnValueTest,
        comparator: 'not-a-comparator',
      },
      chain: 5,
    };

    const badTimeCondition = new TimeCondition(badTimeObj);
    expect(() => badTimeCondition.toObj()).toThrow(
      'Invalid condition: "returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
    );

    const { error } = badTimeCondition.validate(badTimeObj);
    expect(error?.message).toEqual(
      '"returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
    );
  });
});
