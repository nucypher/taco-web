import { CompoundCondition } from '../../../src/conditions';
import { ERC721Ownership } from '../../../src/conditions/predefined/erc721';
import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../testVariables';

describe('validate', () => {
  const ownsBufficornNFT = ERC721Ownership.fromObj({
    contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
    parameters: [3591],
    chain: 5,
  }).toObj();

  it('accepts or operator', () => {
    const orCondition = new CompoundCondition({
      operator: 'or',
      operands: [ownsBufficornNFT, testTimeConditionObj],
    }).toObj();

    expect(orCondition.operator).toEqual('or');
    expect(orCondition.operands).toEqual([
      ownsBufficornNFT,
      testTimeConditionObj,
    ]);
  });

  it('accepts and operator', () => {
    const orCondition = new CompoundCondition({
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    }).toObj();

    expect(orCondition.operator).toEqual('and');
    expect(orCondition.operands).toEqual([
      testContractConditionObj,
      testTimeConditionObj,
    ]);
  });

  it('rejects an invalid operator', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'not-an-operator',
        operands: [testRpcConditionObj, testTimeConditionObj],
      }).toObj()
    ).toThrow('"operator" must be one of [and, or]');
  });

  it('rejects invalid number of operands = 0', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'or',
        operands: [],
      }).toObj()
    ).toThrow('"operands" must contain at least 2 items');
  });

  it('rejects invalid number of operands = 1', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'or',
        operands: [testRpcConditionObj],
      }).toObj()
    ).toThrow('"operands" must contain at least 2 items');
  });

  it('it allows recursive compound conditions', () => {
    const compoundCondition = new CompoundCondition({
      operator: 'and',
      operands: [
        testContractConditionObj,
        testTimeConditionObj,
        testRpcConditionObj,
        {
          operator: 'or',
          operands: [ownsBufficornNFT, testContractConditionObj],
        },
      ],
    }).toObj();
    expect(compoundCondition.operator).toEqual('and');
    expect(compoundCondition.operands).toHaveLength(4);
  });
});
