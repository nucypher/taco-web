/* eslint-disable @typescript-eslint/no-loss-of-precision */

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
  const numbersToTest = [
    {
      name: 'uint256 large positive',
      // The max uint256 cannot be encoded correctly in javascript becuase it is too large.
      // For that some arbitraty extra large positive number is used:
      //  11579208923731619542357098500868790785326998466564056403945758400791312963993
      // Which is less by a littile from the max uint256 (note 5 at the end):
      //  115792089237316195423570985008687907853269984665640564039457584007913129639935
      value: 11579208923731619542357098500868790785326998466564056403945758400791312963993,
      expected:
        (11579208923731619542357098500868790785326998466564056403945758400791312963993).toString(
          16,
        ),
    },
    {
      name: 'int256 min',
      value:
        -57896044618658097711785492504343953926634992332820282019728792003956564819968,
      expected:
        (-57896044618658097711785492504343953926634992332820282019728792003956564819968).toString(
          16,
        ),
    },
    {
      name: 'large positive bigint',
      value: BigInt(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      ),
      expected: BigInt(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      ).toString(16),
    },
    {
      name: 'large negative bigint',
      value: BigInt(
        '-57896044618658097711785492504343953926634992332820282019728792003956564819968',
      ),
      expected: BigInt(
        '-57896044618658097711785492504343953926634992332820282019728792003956564819968',
      ).toString(16),
    },
    {
      name: 'positive bigint within the number safe range',
      value: BigInt(10),
      expected: 10,
    },
    {
      name: 'negative bigint within the number safe range',
      value: BigInt(-10),
      expected: -10,
    },
  ];

  numbersToTest.forEach(({ name, value, expected }) => {
    it(`checking ${name}`, () => {
      const contractCondition = new ContractCondition({
        chain: TEST_CHAIN_ID,
        method: 'method',
        parameters: [value],
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
          value,
        },
      });
      const conditionExpr = new ConditionExpression(contractCondition);
      expect(conditionExpr.toJson()).toContain(expected);
    });
  });
});
