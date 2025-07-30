import axios from 'axios';
import * as https from 'https';
import { describe, test } from 'vitest';
import {
  CompoundCondition,
  CompoundConditionType,
} from '../src/conditions/compound-condition';
import { ConditionExpression } from '../src/conditions/condition-expr';
import { IfThenElseConditionType } from '../src/conditions/if-then-else-condition';
import {
  ECDSAConditionProps,
  ECDSAConditionType,
  SUPPORTED_ECDSA_CURVES,
} from '../src/conditions/schemas/ecdsa';
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
      // Note: there are limits to conditions
      // - max 5 operands in a multi-condition (compound, sequential)
      // - max 2 nested levels of multi-conditions (compound, sequential, if-then-else)
      const overallCondition = new SequentialCondition({
        conditionVariables: [
          {
            varName: 'compound-1',
            condition: {
              conditionType: CompoundConditionType,
              operator: 'and',
              operands: [
                testRpcConditionObj,
                testTimeConditionObj,
                testContractConditionObj,
                testJsonApiConditionObj,
                testJsonRpcConditionObj,
              ],
            },
          },
          {
            varName: 'compound-2',
            condition: {
              conditionType: CompoundConditionType,
              operator: 'or',
              operands: [
                {
                  ...testJsonApiConditionObj,
                  authorizationToken: ':authToken',
                },
                {
                  ...testJsonApiConditionObj,
                  authorizationToken: ':authToken',
                  authorizationType: 'Bearer',
                },
                {
                  ...testJsonApiConditionObj,
                  authorizationToken: ':authToken',
                  authorizationType: 'X-API-Key',
                },
                {
                  ...testJsonRpcConditionObj,
                  authorizationToken: ':otherAuthToken',
                  authorizationType: 'Basic',
                },
                testJWTConditionObj,
              ],
            },
          },
          {
            varName: 'ifThenElse',
            condition: {
              conditionType: IfThenElseConditionType,
              ifCondition: testSigningObjectAttributeConditionObj,
              thenCondition: testSigningObjectAbiAttributeConditionObj,
              elseCondition: false,
            },
          },
        ],
      });
      const conditionExpr = new ConditionExpression(overallCondition);
      await validateConditionExpression(conditionExpr);
    }, 15000);
    test('validate ecdsa condition lingo and supported curves consistency', async () => {
      // Split SUPPORTED_ECDSA_CURVES into chunks of 5 to respect the operand limit
      const preGeneratedVerifyingKeys = {
        SECP256k1:
          '73149ad37ec1f7cde150064b30e4b0b087ef2f8970c05e53e94f1e87c832d76be0bcc14fdbcf3a6c0118d2288ee85613f31df7faddfa83901f5d45e416d84524',
        NIST256p:
          'ef48b327951114d2c54428c5b21a71e01f5cc0660c7087c99df7b1617091425fa660e3ead29e87670ea4074dc8ef5aabb5e433285eeff8c4ff83f6159c11028d',
        NIST384p:
          '64b65f2e8bfd92d8e14f172100f00e31d467f4f178fcd587e44c07a2482ae3d01ea5a7f67b70e2f77412ecc72954b769b80b0286864c124a3ac769d7705080a66e2b2da408b3d2dac06259118b713000d850898fdcceb5cdb736112c3897a07f',
        NIST521p:
          '01990fbe474c5c757210d3ad93961bb510b330f37fb8e96b5038616d73ffea0d0bb6956be31859e3bf9c4e1b47e160c8f1493f21f76e7b03cdc9f0df835a33261ac5004e2ad7564ccb95f38f7a81d8b4fecb72816d93ca8e52186fc4209049b46c685ed0d4fe8b34ca6276f0a640184046c751fe131d757b1169a88d4f996c9f6f8274fb',
        Ed25519:
          'e6a8ea0dd8b6d7f82ba1b24aeca4ee53f69632ed75480a13e823899a9c3e9554',
        BRAINPOOLP256r1:
          '975fda96fa12226a378f52a423e2d12d4fed717162ec7e5838169ed57e3357f2410dce2ce1b6bce3bb46ee97d90e542d9895c7d5b0224da05209eaaf0e484acd',
      };

      // Value used for chunkSize is to ensure:
      // 1. we don't exceed the max 5 operands in a multi-condition
      // 2. we adhere to the fact that "and" compound conditions must have at least 2 operands
      // 3. SUPPORTED_ECDSA_CURVES.length is currently 6, so we can split it into chunks of 3
      const chunkSize = 3;
      for (let i = 0; i < SUPPORTED_ECDSA_CURVES.length; i += chunkSize) {
        const chunk = SUPPORTED_ECDSA_CURVES.slice(i, i + chunkSize);
        const operands: ECDSAConditionProps[] = chunk.map((curve) => ({
          conditionType: ECDSAConditionType,
          message: ':message',
          signature: ':signature',
          verifyingKey: preGeneratedVerifyingKeys[curve],
          curve,
        }));
        const overallCondition = new CompoundCondition({
          operator: 'and',
          operands,
        });
        const conditionExpr = new ConditionExpression(overallCondition);
        await validateConditionExpression(conditionExpr);
      }
    }, 15000);
  },
);
