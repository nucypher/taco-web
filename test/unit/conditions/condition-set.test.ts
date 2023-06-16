import { CompoundCondition, ConditionSet } from '../../../src/conditions';
import {
  ContractCondition,
  RpcCondition,
  TimeCondition,
} from '../../../src/conditions/base';
import { ERC721Balance } from '../../../src/conditions/predefined';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '../testVariables';
import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../testVariables';

describe('condition set', () => {
  const erc721BalanceCondition = new ERC721Balance({
    chain: TEST_CHAIN_ID,
    contractAddress: TEST_CONTRACT_ADDR,
  });
  const contractCondition = new ContractCondition(testContractConditionObj);
  const rpcCondition = new RpcCondition(testRpcConditionObj);
  const timeCondition = new TimeCondition(testTimeConditionObj);
  const compoundCondition = new CompoundCondition({
    operator: 'and',
    operands: [
      testContractConditionObj,
      testTimeConditionObj,
      testRpcConditionObj,
      {
        operator: 'or',
        operands: [testTimeConditionObj, testContractConditionObj],
      },
    ],
  });

  describe('serialization', () => {
    it.each([
      erc721BalanceCondition,
      contractCondition,
      rpcCondition,
      timeCondition,
      compoundCondition,
    ])('serializes to and from json', async (condition) => {
      const conditionSet = new ConditionSet(condition);
      const conditionSetJson = conditionSet.toJson();
      expect(conditionSetJson).toBeDefined();
      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.equals(conditionSetFromJson)).toBeTruthy();
    });
  });

  it.each([
    // no "operator" nor "method" value
    {
      randoKey: 'randoValue',
      otherKey: 'otherValue',
    },
    // invalid "method" and no "contractAddress"
    {
      method: 'doWhatIWant',
      returnValueTest: {
        index: 0,
        comparator: '>',
        value: '100',
      },
      chain: 5,
    },
    // condition with wrong method "method" and no contract address
    {
      ...testTimeConditionObj,
      method: 'doWhatIWant',
    },
    // rpc condition (no contract address) with disallowed method
    {
      ...testRpcConditionObj,
      method: 'isPolicyActive',
    },
  ])("can't determine condition type", async (invalidCondition) => {
    expect(() => {
      ConditionSet.fromObj({
        condition: invalidCondition,
      });
    }).toThrow('unrecognized condition data');
  });

  it('erc721 condition serialization', async () => {
    const conditionSet = new ConditionSet(erc721BalanceCondition);

    const erc721BalanceConditionObj = erc721BalanceCondition.toObj();
    const conditionSetJson = conditionSet.toJson();
    expect(conditionSetJson).toBeDefined();
    expect(conditionSetJson).toContain('chain');
    expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
    expect(conditionSetJson).toContain('contractAddress');
    expect(conditionSetJson).toContain(
      erc721BalanceConditionObj.contractAddress
    );
    expect(conditionSetJson).toContain('standardContractType');
    expect(conditionSetJson).toContain('ERC721');
    expect(conditionSetJson).toContain('method');
    expect(conditionSetJson).toContain(erc721BalanceConditionObj.method);
    expect(conditionSetJson).toContain('returnValueTest');

    const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
    expect(conditionSetFromJson).toBeDefined();
    expect(conditionSetFromJson.condition).toBeInstanceOf(ContractCondition);
  });

  it('contract condition serialization', async () => {
    const conditionSet = new ConditionSet(contractCondition);

    const conditionSetJson = conditionSet.toJson();
    expect(conditionSetJson).toBeDefined();
    expect(conditionSetJson).toContain('chain');
    expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
    expect(conditionSetJson).toContain('contractAddress');
    expect(conditionSetJson).toContain(
      testContractConditionObj.contractAddress
    );
    expect(conditionSetJson).toContain('standardContractType');
    expect(conditionSetJson).toContain(
      testContractConditionObj.standardContractType
    );
    expect(conditionSetJson).toContain('method');
    expect(conditionSetJson).toContain(testContractConditionObj.method);
    expect(conditionSetJson).toContain('parameters');
    expect(conditionSetJson).toContain(testContractConditionObj.parameters[0]);
    expect(conditionSetJson).toContain('returnValueTest');

    expect(conditionSetJson).not.toContain('operator');
    expect(conditionSetJson).not.toContain('operands');

    const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
    expect(conditionSetFromJson).toBeDefined();
    expect(conditionSetFromJson.condition).toBeInstanceOf(ContractCondition);
  });

  it('time condition serialization', async () => {
    const conditionSet = new ConditionSet(timeCondition);

    const conditionSetJson = conditionSet.toJson();
    expect(conditionSetJson).toBeDefined();
    expect(conditionSetJson).toContain('chain');
    expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
    expect(conditionSetJson).toContain('method');
    expect(conditionSetJson).toContain(testTimeConditionObj.method);
    expect(conditionSetJson).toContain('returnValueTest');
    expect(conditionSetJson).not.toContain('parameters');
    expect(conditionSetJson).not.toContain('contractAddress');
    expect(conditionSetJson).not.toContain('standardContractType');
    expect(conditionSetJson).not.toContain('operator');
    expect(conditionSetJson).not.toContain('operands');

    const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
    expect(conditionSetFromJson).toBeDefined();
    expect(conditionSetFromJson.condition).toBeInstanceOf(TimeCondition);
  });

  it('rpc condition serialization', async () => {
    const conditionSet = new ConditionSet(rpcCondition);

    const conditionSetJson = conditionSet.toJson();
    expect(conditionSetJson).toBeDefined();
    expect(conditionSetJson).toContain('chain');
    expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
    expect(conditionSetJson).toContain('method');
    expect(conditionSetJson).toContain(testRpcConditionObj.method);
    expect(conditionSetJson).toContain('parameters');
    expect(conditionSetJson).toContain(testRpcConditionObj.parameters[0]);
    expect(conditionSetJson).toContain('returnValueTest');
    expect(conditionSetJson).not.toContain('contractAddress');
    expect(conditionSetJson).not.toContain('standardContractType');
    expect(conditionSetJson).not.toContain('operator');
    expect(conditionSetJson).not.toContain('operands');

    const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
    expect(conditionSetFromJson).toBeDefined();
    expect(conditionSetFromJson.condition).toBeInstanceOf(RpcCondition);
  });

  it('compound condition serialization', async () => {
    const conditionSet = new ConditionSet(compoundCondition);
    const compoundConditionObj = compoundCondition.toObj();

    const conditionSetJson = conditionSet.toJson();
    expect(conditionSetJson).toContain('operator');
    expect(conditionSetJson).toContain(compoundConditionObj.operator);
    expect(conditionSetJson).toContain('operands');

    expect(conditionSetJson).toBeDefined();
    expect(conditionSetJson).toContain('chain');
    expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
    expect(conditionSetJson).toContain('method');
    expect(conditionSetJson).toContain(testRpcConditionObj.method);
    expect(conditionSetJson).toContain(testTimeConditionObj.method);
    expect(conditionSetJson).toContain(testContractConditionObj.method);
    expect(conditionSetJson).toContain('parameters');
    expect(conditionSetJson).toContain(testRpcConditionObj.parameters[0]);
    expect(conditionSetJson).toContain(testContractConditionObj.parameters[0]);

    const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
    expect(conditionSetFromJson).toBeDefined();
    expect(conditionSetFromJson.condition).toBeInstanceOf(CompoundCondition);
  });
});
