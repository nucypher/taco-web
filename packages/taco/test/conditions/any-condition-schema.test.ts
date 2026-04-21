import { describe, expect, it } from 'vitest';

import {
  CompoundCondition,
  compoundConditionSchema,
  CompoundConditionType,
} from '../../src/conditions/compound-condition';
import {
  testCompoundConditionObj,
  testContextVariableConditionObj,
  testContractConditionObj,
  testECDSAConditionObj,
  testIfThenElseConditionObj,
  testJsonApiConditionObj,
  testJsonConditionObj,
  testJsonRpcConditionObj,
  testJWTConditionObj,
  testRpcConditionObj,
  testSequentialConditionObj,
  testSigningObjectAbiAttributeConditionObj,
  testSigningObjectAttributeConditionObj,
  testTimeConditionObj,
} from '../test-utils';

/**
 * This test ensures that all condition types are included in anyConditionSchema.
 * If a new condition type is added but not included in anyConditionSchema,
 * it will fail validation when used inside compound/sequential conditions.
 *
 * When adding a new condition type:
 * 1. Add a test object in test-utils.ts
 * 2. Add it to the test cases below
 * 3. Ensure it's imported and added to anyConditionSchema in schemas/utils.ts
 */
describe('anyConditionSchema completeness', () => {
  const allConditionTestObjects = [
    { name: 'rpc', obj: testRpcConditionObj },
    { name: 'time', obj: testTimeConditionObj },
    { name: 'contract', obj: testContractConditionObj },
    { name: 'contextVariable', obj: testContextVariableConditionObj },
    { name: 'json', obj: testJsonConditionObj },
    { name: 'jsonApi', obj: testJsonApiConditionObj },
    { name: 'jsonRpc', obj: testJsonRpcConditionObj },
    { name: 'jwt', obj: testJWTConditionObj },
    { name: 'ecdsa', obj: testECDSAConditionObj },
    {
      name: 'signingObjectAttribute',
      obj: testSigningObjectAttributeConditionObj,
    },
    {
      name: 'signingObjectAbiAttribute',
      obj: testSigningObjectAbiAttributeConditionObj,
    },
    { name: 'compound', obj: testCompoundConditionObj },
    { name: 'sequential', obj: testSequentialConditionObj },
    { name: 'ifThenElse', obj: testIfThenElseConditionObj },
  ];

  it.each(allConditionTestObjects)(
    'validates $name condition inside compound condition',
    ({ name, obj }) => {
      const compoundWithCondition = {
        conditionType: CompoundConditionType,
        operator: 'not',
        operands: [obj],
      };

      const result = CompoundCondition.validate(
        compoundConditionSchema,
        compoundWithCondition,
      );

      expect(
        result.error,
        `${name} condition should be valid inside compound condition. ` +
          `If this fails, ensure ${name}ConditionSchema is added to anyConditionSchema in schemas/utils.ts`,
      ).toBeUndefined();
    },
  );
});
