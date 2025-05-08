import { initialize } from '@nucypher/nucypher-core';
import { objectEquals } from '@nucypher/shared';
import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { SemVer } from 'semver';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  ContractCondition,
  ContractConditionProps,
} from '../../src/conditions/base/contract';
import { JsonApiCondition } from '../../src/conditions/base/json-api';
import { JsonRpcCondition } from '../../src/conditions/base/json-rpc';
import { RpcCondition, RpcConditionType } from '../../src/conditions/base/rpc';
import {
  TimeCondition,
  TimeConditionProps,
} from '../../src/conditions/base/time';
import { CompoundCondition } from '../../src/conditions/compound-condition';
import { ConditionExpression } from '../../src/conditions/condition-expr';
import { ERC721Balance } from '../../src/conditions/predefined/erc721';
import { toJSON } from '../../src/utils';
import {
  testContractConditionObj,
  testFunctionAbi,
  testJsonApiConditionObj,
  testJsonRpcConditionObj,
  testRpcConditionObj,
  testRpcReturnValueTest,
  testTimeConditionObj,
} from '../test-utils';

describe('condition set', () => {
  const erc721Balance = new ERC721Balance({
    chain: TEST_CHAIN_ID,
    contractAddress: TEST_CONTRACT_ADDR,
    returnValueTest: {
      comparator: '>',
      value: 0,
    },
  });

  const contractConditionNoAbi = new ContractCondition(
    testContractConditionObj,
  );

  const customParamKey = ':customParam';
  const contractConditionWithAbiObj: ContractConditionProps = {
    ...testContractConditionObj,
    standardContractType: undefined,
    functionAbi: testFunctionAbi,
    method: testFunctionAbi.name,
    parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
    returnValueTest: {
      ...testRpcReturnValueTest,
    },
  };
  const contractConditionWithAbi = new ContractCondition(
    contractConditionWithAbiObj,
  );

  const rpcCondition = new RpcCondition(testRpcConditionObj);
  const timeCondition = new TimeCondition(testTimeConditionObj);
  const jsonApiCondition = new JsonApiCondition(testJsonApiConditionObj);
  const jsonRpcCondition = new JsonRpcCondition(testJsonRpcConditionObj);
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

  beforeAll(async () => {
    await initialize();
  });

  describe('equality', () => {
    const conditionExprCurrentVersion = new ConditionExpression(rpcCondition);

    it('same version and condition', () => {
      const conditionExprSameCurrentVersion = new ConditionExpression(
        rpcCondition,
        ConditionExpression.version,
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprSameCurrentVersion),
      ).toBeTruthy();
    });

    it('different minor/patch version but same condition', () => {
      const conditionExprOlderMinorVersion = new ConditionExpression(
        rpcCondition,
        '0.1.0',
      );
      const conditionExprOlderPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.0.1',
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderPatchVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(conditionExprOlderPatchVersion),
      ).not.toBeTruthy();
    });

    it('minor/patch number greater than major; still older', () => {
      const conditionExprOlderMinorVersion = new ConditionExpression(
        rpcCondition,
        '0.9.0',
      );
      const conditionExprOlderPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.0.9',
      );
      const conditionExprOlderMinorPatchVersion = new ConditionExpression(
        rpcCondition,
        '0.9.9',
      );
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderPatchVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprCurrentVersion.equals(conditionExprOlderMinorPatchVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(conditionExprOlderPatchVersion),
      ).not.toBeTruthy();
      expect(
        conditionExprOlderMinorVersion.equals(
          conditionExprOlderMinorPatchVersion,
        ),
      ).not.toBeTruthy();
      expect(
        conditionExprOlderPatchVersion.equals(
          conditionExprOlderMinorPatchVersion,
        ),
      ).not.toBeTruthy();
    });

    it.each([
      erc721Balance,
      contractConditionNoAbi,
      contractConditionWithAbi,
      timeCondition,
      compoundCondition,
    ])('same version but different condition', (condition) => {
      const conditionExprSameVersionDifferentCondition =
        new ConditionExpression(condition);
      expect(
        conditionExprCurrentVersion.equals(
          conditionExprSameVersionDifferentCondition,
        ),
      ).not.toBeTruthy();
    });

    it('same contract condition although using erc721 helper', () => {
      const conditionExpr = new ConditionExpression(erc721Balance);
      const erc721ConditionData = erc721Balance.toObj();
      const sameContractCondition = new ContractCondition(erc721ConditionData);
      const contractConditionExpr = new ConditionExpression(
        sameContractCondition,
      );
      expect(
        objectEquals(conditionExpr.toObj(), contractConditionExpr.toObj()),
      ).toBeTruthy();
    });
  });

  describe('serialization / deserialization', () => {
    it.each([
      erc721Balance,
      contractConditionNoAbi,
      contractConditionWithAbi,
      rpcCondition,
      timeCondition,
      compoundCondition,
    ])('serializes to and from json', (condition) => {
      const conditionExpr = new ConditionExpression(condition);
      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('version');
      expect(conditionExprJson).toContain(ConditionExpression.version);
      expect(conditionExprJson).toContain('condition');
      expect(conditionExprJson).toContain(toJSON(condition.toObj()));

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.equals(conditionExprFromJson)).toBeTruthy();

      const asCoreCondition = conditionExprFromJson.toCoreCondition();
      const fromCoreCondition =
        ConditionExpression.fromCoreConditions(asCoreCondition);
      expect(fromCoreCondition).toBeDefined();
      expect(fromCoreCondition.equals(conditionExprFromJson)).toBeTruthy();
    });

    it('serializes to and from WASM conditions', () => {
      const conditionExpr = new ConditionExpression(erc721Balance);
      const coreConditions = conditionExpr.toCoreCondition();
      const fromCoreConditions =
        ConditionExpression.fromCoreConditions(coreConditions);
      expect(conditionExpr.equals(fromCoreConditions)).toBeTruthy();
    });

    it('incompatible version', () => {
      const currentVersion = new SemVer(ConditionExpression.version);
      const invalidVersion = currentVersion.inc('major');
      expect(() => {
        ConditionExpression.fromObj({
          version: invalidVersion.version,
          condition: testTimeConditionObj,
        });
      }).toThrow(
        `Version provided, ${invalidVersion}, is incompatible with current version, ${ConditionExpression.version}`,
      );
    });

    it.each(['version', 'x.y', 'x.y.z', '-1,0.0', '1.0.0.0.0.0.0'])(
      'invalid versions',
      (invalidVersion) => {
        expect(() => {
          ConditionExpression.fromObj({
            version: invalidVersion,
            condition: testTimeConditionObj,
          });
        }).toThrow(`Invalid Version: ${invalidVersion}`);
      },
    );

    it.each(['_invalid_condition_type_', undefined as unknown as string])(
      'rejects an invalid condition type',
      (invalidConditionType) => {
        const conditionObj = {
          ...testTimeConditionObj,
          conditionType: invalidConditionType,
        } as unknown as TimeConditionProps;
        expect(() => {
          ConditionExpression.fromObj({
            version: ConditionExpression.version,
            condition: conditionObj,
          });
        }).toThrow(`Invalid condition type: ${invalidConditionType}`);
      },
    );

    it('rejects a mismatched condition type', () => {
      const conditionObj = {
        ...testTimeConditionObj,
        conditionType: RpcConditionType,
      } as unknown as TimeConditionProps;
      expect(() => {
        ConditionExpression.fromObj({
          version: ConditionExpression.version,
          condition: conditionObj,
        });
      }).toThrow(/^Invalid condition/);
    });

    it('erc721 condition serialization', () => {
      const conditionExpr = new ConditionExpression(erc721Balance);

      const asObj = erc721Balance.toObj();
      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(asObj.contractAddress);
      expect(conditionExprJson).toContain('standardContractType');
      expect(conditionExprJson).toContain('ERC721');
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(asObj.method);
      expect(conditionExprJson).toContain('returnValueTest');

      expect(conditionExprJson).not.toContain('functionAbi');
      expect(conditionExprJson).not.toContain('operator');
      expect(conditionExprJson).not.toContain('operands');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(ContractCondition);
    });

    it('contract condition no abi serialization', () => {
      const conditionExpr = new ConditionExpression(contractConditionNoAbi);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(
        testContractConditionObj.contractAddress,
      );
      expect(conditionExprJson).toContain('standardContractType');
      expect(conditionExprJson).toContain(
        testContractConditionObj.standardContractType,
      );
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(testContractConditionObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(
        testContractConditionObj.parameters[0],
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

    it('contract condition with abi serialization', () => {
      const conditionExpr = new ConditionExpression(contractConditionWithAbi);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('chain');
      expect(conditionExprJson).toContain(TEST_CHAIN_ID.toString());
      expect(conditionExprJson).toContain('contractAddress');
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.contractAddress,
      );
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain(contractConditionWithAbiObj.method);
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.parameters[0],
      );
      expect(conditionExprJson).toContain(
        contractConditionWithAbiObj.parameters[1],
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

    it('time condition serialization', () => {
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

    it('rpc condition serialization', () => {
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

    it('json api condition serialization', () => {
      const conditionExpr = new ConditionExpression(jsonApiCondition);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('endpoint');
      expect(conditionExprJson).toContain(
        'https://_this_would_totally_fail.com',
      );
      expect(conditionExprJson).toContain('parameters');
      expect(conditionExprJson).toContain('query');
      expect(conditionExprJson).toContain('$.ethereum.usd');
      expect(conditionExprJson).toContain('returnValueTest');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(JsonApiCondition);
    });

    it('json rpc condition serialization', () => {
      const conditionExpr = new ConditionExpression(jsonRpcCondition);

      const conditionExprJson = conditionExpr.toJson();
      expect(conditionExprJson).toBeDefined();
      expect(conditionExprJson).toContain('endpoint');
      expect(conditionExprJson).toContain('https://math.example.com/');
      expect(conditionExprJson).toContain('method');
      expect(conditionExprJson).toContain('subtract');
      expect(conditionExprJson).toContain('params');
      expect(conditionExprJson).toContain('[42,23]');

      expect(conditionExprJson).toContain('query');
      expect(conditionExprJson).toContain('$.mathresult');
      expect(conditionExprJson).toContain('returnValueTest');

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(JsonRpcCondition);
    });

    it('compound condition serialization', () => {
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
        testContractConditionObj.parameters[0],
      );

      const conditionExprFromJson =
        ConditionExpression.fromJSON(conditionExprJson);
      expect(conditionExprFromJson).toBeDefined();
      expect(conditionExprFromJson.condition).toBeInstanceOf(CompoundCondition);
    });
  });
});
