import { TEST_CHAIN_ID } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { ConditionExpression } from '../../src/conditions/condition-expr';
import {
  testJsonApiConditionObj,
  testJsonRpcConditionObj,
  testJWTConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../test-utils';

describe('check that valid lingo in python is valid in typescript', () => {
  const contractConditionProps = {
    conditionType: 'contract',
    chain: TEST_CHAIN_ID,
    method: 'isPolicyActive',
    parameters: [':hrac'],
    contractAddress: '0xA1bd3630a13D54EDF7320412B5C9F289230D260d',
    functionAbi: {
      type: 'function',
      name: 'isPolicyActive',
      stateMutability: 'view',
      inputs: [
        {
          name: '_policyID',
          type: 'bytes16',
          internalType: 'bytes16',
        },
      ],
      outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    },
    returnValueTest: {
      comparator: '==',
      value: true,
    },
  };
  const sequentialConditionProps = {
    conditionType: 'sequential',
    conditionVariables: [
      {
        varName: 'timeValue',
        condition: testTimeConditionObj,
      },
      {
        varName: 'rpcValue',
        condition: testRpcConditionObj,
      },
      {
        varName: 'contractValue',
        condition: contractConditionProps,
      },
      {
        varName: 'jsonValue',
        condition: testJsonApiConditionObj,
      },
    ],
  };
  const ifThenElseConditionProps = {
    conditionType: 'if-then-else',
    ifCondition: testJsonRpcConditionObj,
    thenCondition: testJsonApiConditionObj,
    elseCondition: testTimeConditionObj,
  };

  const compoundConditionProps = {
    conditionType: 'compound',
    operator: 'and',
    operands: [
      contractConditionProps,
      ifThenElseConditionProps,
      sequentialConditionProps,
      testRpcConditionObj,
      {
        conditionType: 'compound',
        operator: 'not',
        operands: [testTimeConditionObj],
      },
    ],
  };

  it.each([
    testRpcConditionObj,
    testTimeConditionObj,
    contractConditionProps,
    testJsonApiConditionObj,
    testJsonRpcConditionObj,
    testJWTConditionObj,
    compoundConditionProps,
    sequentialConditionProps,
    ifThenElseConditionProps,
  ])('parsing of all condition types', (conditionProps) => {
    const conditionExprJSON = {
      version: ConditionExpression.version,
      condition: conditionProps,
    };
    const conditionExpr = ConditionExpression.fromObj(conditionExprJSON);
    expect(conditionExpr.toObj()).toBeDefined();
    expect(conditionExpr.condition.toObj()).toEqual(conditionProps);
  });
});
