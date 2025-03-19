import { TEST_CHAIN_ID } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { ContractCondition } from '../../src/conditions/base/contract';
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

describe('check large numbers serialization into hex string', () => {
  it('checking uint256 max', () => {
    const uint256ContractConditionProps = {
      chain: TEST_CHAIN_ID,
      method: 'method',
      parameters: [
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        115792089237316195423570985008687907853269984665640564039457584007913129639935,
      ],
      contractAddress: '0xA1bd3630a13D54EDF7320412B5C9F289230D260d',
      functionAbi: {
        type: 'function',
        name: 'someMethod',
        stateMutability: 'view',
        inputs: [
          {
            name: '_value',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
        outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      },
      returnValueTest: {
        comparator: '==',
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        value: 115792089237316195423570985008687907853269984665640564039457584007913129639935,
      },
    };

    console.log(uint256ContractConditionProps);

    const contractCondition = new ContractCondition(
      uint256ContractConditionProps,
    );
    const conditionExpr = new ConditionExpression(contractCondition);
    expect(conditionExpr.toJson()).toContain(
      (115792089237316195423570985008687907853269984665640564039457584007913129639935).toString(
        16,
      ),
    );
  });

  it('checking int256 min', () => {
    const int256ContractConditionProps = {
      chain: TEST_CHAIN_ID,
      method: 'method',
      parameters: [
        -57896044618658097711785492504343953926634992332820282019728792003956564819968,
      ],
      contractAddress: '0xA1bd3630a13D54EDF7320412B5C9F289230D260d',
      functionAbi: {
        type: 'function',
        name: 'someMethod',
        stateMutability: 'view',
        inputs: [
          {
            name: '_value',
            type: 'int256',
            internalType: 'int256',
          },
        ],
        outputs: [{ name: '', type: 'int256', internalType: 'int256' }],
      },
      returnValueTest: {
        comparator: '==',
        value:
          -57896044618658097711785492504343953926634992332820282019728792003956564819968,
      },
    };

    const contractCondition = new ContractCondition(
      int256ContractConditionProps,
    );
    const conditionExpr = new ConditionExpression(contractCondition);
    expect(conditionExpr.toJson()).toContain(
      (-57896044618658097711785492504343953926634992332820282019728792003956564819968).toString(
        16,
      ),
    );
  });
});
