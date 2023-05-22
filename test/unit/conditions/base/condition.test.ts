import { ERC721Balance } from '../../../../src/conditions/predefined';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '../../testVariables';

describe('validation', () => {
  // TODO: Consider:
  //   Use Condition here with returnTestValue schema
  //   Refactor returnTestValue to be the part of the Condition
  const condition = new ERC721Balance();
  let result = condition.validate({
    contractAddress: TEST_CONTRACT_ADDR,
    chain: TEST_CHAIN_ID,
  });

  it('accepts a correct schema', async () => {
    expect(result.error).toBeUndefined();
    expect(result.value.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  it('updates on a valid schema value', async () => {
    result = condition.validate({ chain: TEST_CHAIN_ID });
    expect(result.error).toBeUndefined();
    expect(result.value.chain).toEqual(TEST_CHAIN_ID);
  });

  it('rejects on an invalid schema value', async () => {
    result = condition.validate({
      chain: -1,
      contractAddress: TEST_CONTRACT_ADDR,
    });
    expect(result.error?.message).toEqual(
      '"chain" must be one of [1, 5, 137, 80001]'
    );
  });
});
