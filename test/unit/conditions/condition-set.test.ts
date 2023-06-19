import { CompoundCondition, ConditionSet } from '../../../src/conditions';
import {
  ContractCondition,
  RpcCondition,
  TimeCondition,
} from '../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../src/conditions/const';
import { ERC721Balance } from '../../../src/conditions/predefined';
import { toJSON } from '../../../src/utils';
import {
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  testFunctionAbi,
  testReturnValueTest,
} from '../testVariables';
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

  const contractConditionNoAbi = new ContractCondition(
    testContractConditionObj
  );

  const customParamKey = ':customParam';
  const contractConditionWithAbiObj = {
    ...testContractConditionObj,
    standardContractType: undefined,
    functionAbi: testFunctionAbi,
    method: testFunctionAbi.name,
    parameters: [USER_ADDRESS_PARAM, customParamKey],
    returnValueTest: {
      ...testReturnValueTest,
    },
  };
  const contractConditionWithAbi = new ContractCondition(
    contractConditionWithAbiObj
  );

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

  it('equality', async () => {
    const conditionSetCurrentVersion = new ConditionSet(rpcCondition);
    const conditionSetSameCurrentVerstion = new ConditionSet(
      rpcCondition,
      ConditionSet.VERSION
    );
    // same version and condition
    expect(
      conditionSetCurrentVersion.equals(conditionSetSameCurrentVerstion)
    ).toBeTruthy();

    // same version but different condition
    const conditionSetSameVersionDifferentCondition = new ConditionSet(
      timeCondition
    );
    expect(
      conditionSetCurrentVersion.equals(
        conditionSetSameVersionDifferentCondition
      )
    ).not.toBeTruthy();

    // different minor/patch version but same condition
    const conditionSetOlderMinorVersion = new ConditionSet(
      rpcCondition,
      '0.1.0'
    );
    const conditionSetOlderPatchVersion = new ConditionSet(
      rpcCondition,
      '0.0.1'
    );
    expect(
      conditionSetCurrentVersion.equals(conditionSetOlderMinorVersion)
    ).not.toBeTruthy();
    expect(
      conditionSetCurrentVersion.equals(conditionSetOlderPatchVersion)
    ).not.toBeTruthy();
    expect(
      conditionSetOlderMinorVersion.equals(conditionSetOlderPatchVersion)
    ).not.toBeTruthy();
  });

  describe('serialization / deserialization', () => {
    it.each([
      erc721BalanceCondition,
      contractConditionNoAbi,
      contractConditionWithAbi,
      rpcCondition,
      timeCondition,
      compoundCondition,
    ])('serializes to and from json', async (condition) => {
      const conditionSet = new ConditionSet(condition);
      const conditionSetJson = conditionSet.toJson();
      expect(conditionSetJson).toBeDefined();
      expect(conditionSetJson).toContain('version');
      expect(conditionSetJson).toContain(ConditionSet.VERSION);
      expect(conditionSetJson).toContain('condition');
      expect(conditionSetJson).toContain(toJSON(condition.toObj()));

      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.equals(conditionSetFromJson)).toBeTruthy();
    });

    it('incompatible version', async () => {
      const invalidVersion = '100.0.0';
      expect(() => {
        ConditionSet.fromObj({
          version: invalidVersion,
          condition: testTimeConditionObj,
        });
      }).toThrow(
        `Version provided, ${invalidVersion}, is incompatible with current version, ${ConditionSet.VERSION}`
      );
    });

    it.each([
      // no "operator" nor "method" value
      {
        version: ConditionSet.VERSION,
        condition: {
          randoKey: 'randoValue',
          otherKey: 'otherValue',
        },
      },
      // invalid "method" and no "contractAddress"
      {
        version: ConditionSet.VERSION,
        condition: {
          method: 'doWhatIWant',
          returnValueTest: {
            index: 0,
            comparator: '>',
            value: '100',
          },
          chain: 5,
        },
      },
      // condition with wrong method "method" and no contract address
      {
        version: ConditionSet.VERSION,
        condition: {
          ...testTimeConditionObj,
          method: 'doWhatIWant',
        },
      },
      // rpc condition (no contract address) with disallowed method
      {
        version: ConditionSet.VERSION,
        condition: {
          ...testRpcConditionObj,
          method: 'isPolicyActive',
        },
      },
    ])("can't determine condition type", async (invalidCondition) => {
      expect(() => {
        ConditionSet.fromObj(invalidCondition);
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

      expect(conditionSetJson).not.toContain('functionAbi');
      expect(conditionSetJson).not.toContain('operator');
      expect(conditionSetJson).not.toContain('operands');

      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('contract condition no abi serialization', async () => {
      const conditionSet = new ConditionSet(contractConditionNoAbi);

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
      expect(conditionSetJson).toContain(
        testContractConditionObj.parameters[0]
      );
      expect(conditionSetJson).toContain('returnValueTest');
      expect(conditionSetJson).not.toContain('functionAbi');
      expect(conditionSetJson).not.toContain('operator');
      expect(conditionSetJson).not.toContain('operands');

      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('contract condition with abi serialization', async () => {
      const conditionSet = new ConditionSet(contractConditionWithAbi);

      const conditionSetJson = conditionSet.toJson();
      expect(conditionSetJson).toBeDefined();
      expect(conditionSetJson).toContain('chain');
      expect(conditionSetJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionSetJson).toContain('contractAddress');
      expect(conditionSetJson).toContain(
        contractConditionWithAbiObj.contractAddress
      );
      expect(conditionSetJson).toContain('method');
      expect(conditionSetJson).toContain(contractConditionWithAbiObj.method);
      expect(conditionSetJson).toContain('parameters');
      expect(conditionSetJson).toContain(
        contractConditionWithAbiObj.parameters[0]
      );
      expect(conditionSetJson).toContain(
        contractConditionWithAbiObj.parameters[1]
      );
      expect(conditionSetJson).toContain('returnValueTest');
      expect(conditionSetJson).toContain('functionAbi');

      expect(conditionSetJson).not.toContain('standardContractType');
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
      expect(conditionSetJson).not.toContain('functionAbi');
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
      expect(conditionSetJson).not.toContain('functionAbi');
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
      expect(conditionSetJson).toContain(
        testContractConditionObj.parameters[0]
      );

      const conditionSetFromJson = ConditionSet.fromJSON(conditionSetJson);
      expect(conditionSetFromJson).toBeDefined();
      expect(conditionSetFromJson.condition).toBeInstanceOf(CompoundCondition);
    });
  });
});
