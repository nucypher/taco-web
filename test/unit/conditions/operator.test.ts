import { Operator } from '../../../src/conditions';

describe('validate', () => {
  it('accepts a valid operator', () => {
    const op = new Operator('or');
    expect(op.operator).toEqual('or');
  });

  it('rejects an invalid operator', () => {
    expect(() => new Operator('not-an-operator')).toThrow(
      '"not-an-operator" must be one of [and, or]'
    );
  });
});
