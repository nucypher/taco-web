import {
  CompoundCondition,
  ConditionExpression,
} from '../../../src/conditions';
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

  describe('equality', () => {
    const conditionExprCurrentVersion = new ConditionExpression(rpcCondition);

    it('same version and condition', async () => {
      const conditionExprSameCurrentVerstion = new ConditionExpression(
        rpcCondition,
        ConditionExpression.VERSION
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprSameCurrentVerstion)
      ).toBeTruthy();
    });

    it('different minor/patch version but same condition', async () => {
      const conditionExprOlderMinorVersion = new ConditionExpression(
        rpcCondition,
        '0.1.0'
      );
      const conditionExprOlderPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.0.1'
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderPatchVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(conditionExprOlderPatchVersion)
      ).not.toBeTruthy();
    });

    it('minor/patch number greater than major; still older', async () => {
      const conditionExprOlderMinorVersion = new ConditionExpression(
        rpcCondition,
        '0.9.0'
      );
      const conditionExprOlderPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.0.9'
      );
      const conditionExprOlderMinorPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.9.9'
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderPatchVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorPatchVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(conditionExprOlderPatchVersion)
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(
          conditionExprOlderMinorPatchVersion
        )
      ).not.toBeTruthy();
      expect(
        conditionExprOlderPatchVersion.equals(
          conditionExprOlderMinorPatchVersion
        )
      ).not.toBeTruthy();
    });

    it.each([
      erc721BalanceCondition,
      contractConditionNoAbi,
      contractConditionWithAbi,
      timeCondition,
      compoundCondition,
    ])('same version but different condition', async (condition) => {
      const conditionExprSameVersionDifferentCondition =
        new ConditionExpression(condition);
      expect(
        conditionExprCurrentVersion.equals(
          conditionExprSameVersionDifferentCondition
        )
      ).not.toBeTruthy();
    });

    it('same contract condition although using erc721 helper', async () => {
      const erc721ConditionExpr = new ConditionExpression(
        erc721BalanceCondition
      );
      const erc721ConditionData = erc721BalanceCondition.toObj();
      const sameContractCondition = new ContractCondition(erc721ConditionData);
      const contractConditionExpr = new ConditionExpression(
        sameContractCondition
      );
      expect(erc721ConditionExpr.equals(contractConditionExpr)).toBeTruthy();
    });
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
      const conditionExpr = new ConditionExpression(condition);
      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('version');
      expect(conditionExprJson).toContain(ConditionExpression.VERSION);
      expect(conditionExprJson).toContain('condition');
      expect(conditionExprJson).toContain(toJSON(condition.toObj()));

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.equals(conditionExprFromJson)).toBeTruthy();
    });

    it('incompatible version', async () => {
      const invalidVersion = '100.0.0';
      expect(() => {
        ConditionExpression.fromObj({
          version: invalidVersion,
          condition: testTimeConditionObj,
        });
      }).toThrow(
        `Version provided, ${invalidVersion}, is incompatible with current version, ${ConditionExpression.VERSION}`
      );
    });

    it.each([
      // no "operator" nor "method" value
      {
        version: ConditionExpression.VERSION,
        condition: {
          randoKey: 'randoValue',
          otherKey: 'otherValue',
        },
      },
      // invalid "method" and no "contractAddress"
      {
        version: ConditionExpression.VERSION,
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
        version: ConditionExpression.VERSION,
        condition: {
          ...testTimeConditionObj,
          method: 'doWhatIWant',
        },
      },
      // rpc condition (no contract address) with disallowed method
      {
        version: ConditionExpression.VERSION,
        condition: {
          ...testRpcConditionObj,
          method: 'isPolicyActive',
        },
      },
    ])("can't determine condition type", async (invalidCondition) => {
      expect(() => {
        ConditionExpression.fromObj(invalidCondition);
      }).toThrow('unrecognized condition data');
    });

    it('erc721 condition serialization', async () => {
      const conditionExpr = new ConditionExpression(erc721BalanceCondition);

      const erc721BalanceConditionObj = erc721BalanceCondition.toObj();
      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(
        erc721BalanceConditionObj.contractAddress
      );
      expect(conditionExprJson).toContain('standardContractType');
      expect(conditionExprJson).toContain('ERC721');
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(erc721BalanceConditionObj.method);
      expect(conditionExprJson).toContain('returnValueTest');

      expect(conditionExprJson).not.toContain('functionAbi');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('contract condition no abi serialization', async () => {
      const conditionExpr = new ConditionExpression(contractConditionNoAbi);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(
        testContractConditionObj.contractAddress
      );
      expect(conditionExprJson).toContain('standardContractType');
      expect(conditionExprJson).toContain(
        testContractConditionObj.standardContractType
      );
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(testContractConditionObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(
        testContractConditionObj.parameters[0]
      );
      expect(conditionExprJson).toContain('returnValueTest');
      expect(conditionExprJson).not.toContain('functionAbi');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('contract condition with abi serialization', async () => {
      const conditionExpr = new ConditionExpression(contractConditionWithAbi);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.contractAddress
      );
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(contractConditionWithAbiObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.parameters[0]
      );
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.parameters[1]
      );
      expect(conditionExprJson).toContain('returnValueTest');
      expect(conditionExprJson).toContain('functionAbi');

      expect(conditionExprJson).not.toContain('standardContractType');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('time condition serialization', async () => {
      const conditionExpr = new ConditionExpression(timeCondition);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(testTimeConditionObj.method);
      expect(conditionExprJson).toContain('returnValueTest');
      expect(conditionExprJson).not.toContain('parameters');
      expect(conditionExprJson).not.toContain('contractAddress');
      expect(conditionExprJson).not.toContain('standardContractType');
      expect(conditionExprJson).not.toContain('functionAbi');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(TimeCondition);
    });

    it('rpc condition serialization', async () => {
      const conditionExpr = new ConditionExpression(rpcCondition);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(testRpcConditionObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(testRpcConditionObj.parameters[0]);
      expect(conditionExprJson).toContain('returnValueTest');
      expect(conditionExprJson).not.toContain('contractAddress');
      expect(conditionExprJson).not.toContain('standardContractType');
      expect(conditionExprJson).not.toContain('functionAbi');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(RpcCondition);
    });

    it('compound condition serialization', async () => {
      const conditionExpr = new ConditionExpression(compoundCondition);
      const compoundConditionObj = compoundCondition.toObj();

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toContain('operator');
      expect(conditionExprJson).toContain(compoundConditionObj.operator);
      expect(conditionExprJson).toContain('operands');

      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(testRpcConditionObj.method);
      expect(conditionExprJson).toContain(testTimeConditionObj.method);
      expect(conditionExprJson).toContain(testContractConditionObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(testRpcConditionObj.parameters[0]);
      expect(conditionExprJson).toContain(
        testContractConditionObj.parameters[0]
      );

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(CompoundCondition);
    });
  });
});
