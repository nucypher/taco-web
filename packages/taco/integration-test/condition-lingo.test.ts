import axios from 'axios';
import * as https from 'https';
import { describe, test } from 'vitest';
import { CompoundConditionType } from '../src/conditions/compound-condition';
import { ConditionExpression } from '../src/conditions/condition-expr';
import { IfThenElseConditionType } from '../src/conditions/if-then-else-condition';
import { SequentialCondition } from '../src/conditions/sequential';
import {
  testContractConditionObj,
  testJsonApiConditionObj,
  testJsonRpcConditionObj,
  testJWTConditionObj,
  testRpcConditionObj,
  testSigningObjectAbiAttributeConditionObj,
  testSigningObjectAttributeConditionObj,
  testTimeConditionObj,
} from '../test/test-utils';

const LYNX_NODES = [
  'https://lynx-1.nucypher.network',
  'https://lynx-2.nucypher.network',
  'https://lynx-3.nucypher.network',
];

async function validateConditionExpression(
  conditionExpr: ConditionExpression,
): Promise<void> {
  const lynxNode = LYNX_NODES[Math.floor(Math.random() * LYNX_NODES.length)];
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const response = await axios.post(
    `${lynxNode}:9151/validate_condition_lingo`,
    JSON.stringify(conditionExpr.toJson()),
    {
      httpsAgent,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  if (response.status !== 200) {
    throw new Error(
      `Request failed with status ${response.status}: ${JSON.stringify(response.data)}`,
    );
  }
  return;
}

// skip integration test if RUNNING_IN_CI is not set (it is set in CI environments)
describe.skipIf(!process.env.RUNNING_IN_CI)(
  'TACo Condition Lingos Integration Test',
  () => {
    test('validate condition lingo with lynx node to confirm consistency', async () => {
      const overallCondition = new SequentialCondition({
        conditionVariables: [
          {
            varName: 'rpc',
            condition: testRpcConditionObj,
          },
          {
            varName: 'time',
            condition: testTimeConditionObj,
          },
          {
            varName: 'contract',
            condition: testContractConditionObj,
          },
          {
            varName: 'compound',
            condition: {
              conditionType: CompoundConditionType,
              operator: 'or',
              operands: [
                testJsonApiConditionObj,
                testJsonRpcConditionObj,
                testSigningObjectAbiAttributeConditionObj,
                testSigningObjectAttributeConditionObj,
              ],
            },
          },
          {
            varName: 'ifThenElse',
            condition: {
              conditionType: IfThenElseConditionType,
              ifCondition: testJWTConditionObj,
              thenCondition: {
                ...testJsonApiConditionObj,
                authorizationToken: ':authToken',
              },
              elseCondition: {
                ...testJsonRpcConditionObj,
                authorizationToken: ':otherAuthToken',
              },
            },
          },
        ],
      });
      const conditionExpr = new ConditionExpression(overallCondition);
      await validateConditionExpression(conditionExpr);
    }, 15000);
  },
);
