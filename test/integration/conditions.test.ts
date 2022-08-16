import { Operator } from '../../src/policies/conditions';
import { Conditions, ConditionSet } from '../../src/policies/conditions';

const TEST_CONDITIONS = {
  ERC20_balance: {
    contractAddress: '0xadd9d957170DF6f33982001E4C22eCcDd5539118',
    standardContractType: 'ERC20',
    chain: 'ethereum',
    method: 'balanceOf',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '>',
      value: '0',
    },
  },
};

describe('operator', () => {
  it('should validate Operator operator validation', async () => {
    const op = new Operator('or');
    expect(op.operator).toEqual('or');
    expect(() => {
      new Operator('then');
    }).toThrow();
  });
});

describe('conditions schema', () => {
  const contractcondition = new Conditions.ERC721Ownership();
  let result = contractcondition.validate({
    contractAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  });

  it('should validate', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.contractAddress).toEqual(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
    );
  });

  result = contractcondition.validate({ chain: 'mumbai' });
  it('should update the value of "chain"', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.chain).toEqual('mumbai');
  });
});

describe('condition set', () => {
  const genuineUndead = new Conditions.ERC721Ownership({
    contractAddress: '0x209e639a0EC166Ac7a1A4bA41968fa967dB30221',
  });
  const gnomePals = new Conditions.ERC721Ownership({
    contractAddress: '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA',
  });
  const or = new Operator('or');
  const conditions = new ConditionSet([genuineUndead, or, gnomePals]);
  it('should validate', async () => {
    expect(conditions.validate()).toEqual(true);
  });
});

describe('conditions set to/from json', () => {
  const json =
    '[{"chain":"ethereum","method":"ownerOf","parameters":[3591],"standardContractType":"ERC721","returnValueTest":{"comparator":"==","value":":userAddress"},"contractAddress":"0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77"}]';
  const conditionset = ConditionSet.fromJSON(json);
  it('should be a ConditionSet', async () => {
    expect(conditionset.conditions[0].toObj().contractAddress).toEqual(
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'
    );
    expect(conditionset.toJSON()).toEqual(json);
  });
});
