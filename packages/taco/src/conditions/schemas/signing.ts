import { FunctionFragment, ParamType } from 'ethers/lib/utils';
import { z } from 'zod';

import { baseConditionSchema } from './common';
import { blockchainReturnValueTestSchema } from './return-value-test';

export const SIGNING_CONDITION_OBJECT_CONTEXT_VAR = ':signingConditionObject';

const signingConditionSchema = baseConditionSchema.extend({
  signingObjectContextVar: z
    .literal(SIGNING_CONDITION_OBJECT_CONTEXT_VAR)
    .default(SIGNING_CONDITION_OBJECT_CONTEXT_VAR)
    .describe(
      'The context variable that will be replaced with the signing object at signing',
    ),
});

const baseSigningObjectAttributeConditionSchema = signingConditionSchema.extend(
  {
    attributeName: z
      .string()
      .min(1)
      .describe('The name of the attribute to check'),
  },
);

export const SigningObjectAttributeConditionType = 'attribute';

export const signingObjectAttributeConditionSchema: z.ZodSchema =
  baseSigningObjectAttributeConditionSchema.extend({
    conditionType: z
      .literal(SigningObjectAttributeConditionType)
      .default(SigningObjectAttributeConditionType),
    returnValueTest: blockchainReturnValueTestSchema,
  });

export type SigningObjectAttributeConditionProps = z.infer<
  typeof signingObjectAttributeConditionSchema
>;

export const abiParameterValidationSchema: z.ZodSchema = z
  .object({
    parameterIndex: z
      .number()
      .int()
      .nonnegative()
      .describe('index of parameter to check within abi calldata.'),
    indexWithinTuple: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        'index of value within tuple value at parameter index to check',
      ),
    returnValueTest: blockchainReturnValueTestSchema
      .optional()
      .describe('comparison check for value within calldata'),
    nestedAbiValidation: z
      .lazy(() => abiCallValidationSchema)
      .optional()
      .describe('additional checks for nested abi calldata'),
  })
  .refine(
    // An XOR check to see if either 'returnValueTest' or 'nestedAbiValidation' is set
    (parameterValidation) =>
      Boolean(parameterValidation.returnValueTest) !==
      Boolean(parameterValidation.nestedAbiValidation),
    {
      message:
        "At most one of the fields 'returnValueTest' and 'nestedAbiValidation' must be defined",
      path: ['returnValueTest'],
    },
  );

export type AbiParameterValidationProps = z.infer<
  typeof abiParameterValidationSchema
>;

// TODO: is there something already built out there to validate Solidity types?
const isValidSolidityType = (param: ParamType): boolean => {
  // Recursive check for valid Solidity types
  if (!param.baseType || !param.baseType.trim()) {
    return false; // empty type is not valid
  }

  // Check for arrays and tuples
  if (param.baseType === 'tuple') {
    if (!param.components || param.components.length === 0) {
      return false; // arrays and tuples must have components defined
    }
    return param.components.every(isValidSolidityType);
  } else if (param.baseType === 'array') {
    if (!param.arrayChildren) {
      return false; // arrays must have children defined
    }
    return isValidSolidityType(param.arrayChildren);
  } else {
    // YIKES!
    const solidityBaseTypePattern =
      /^(u?int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?|bytes([1-9]|[1-2][0-9]|3[0-2])?|string|address|bool)$/;
    return solidityBaseTypePattern.test(param.baseType);
  }
};

// TODO; find a better way to validate the param type - incomplete best effort for now
const isValidHumanAbiCallSignature = (signature: string): boolean => {
  try {
    // TODO: verify this works properly
    const fragment = FunctionFragment.from(signature);
    for (const parameter of fragment.inputs) {
      if (!isValidSolidityType(parameter)) {
        return false; // invalid Solidity type
      }
    }

    // ensure the same sighash format was provided
    return fragment.format() === signature;
  } catch {
    return false;
  }
};

const humanAbiCallSignatureSchema = z
  .string()
  .refine(isValidHumanAbiCallSignature, {
    message: 'Invalid human readable ABI signature provided',
  })
  .describe('A human readable ABI signature, e.g. "transfer(address,uint256)"');

export const abiCallValidationSchema: z.ZodSchema = z
  .object({
    allowedAbiCalls: z.record(
      humanAbiCallSignatureSchema,
      z.array(abiParameterValidationSchema),
    ),
  })
  .describe(
    'A map of allowed ABI calls with their respective parameter validations.',
  );

export type AbiCallValidationProps = z.infer<typeof abiCallValidationSchema>;

export const SigningObjectAbiAttributeConditionType = 'abi-attribute';

export const signingObjectAbiAttributeConditionSchema: z.ZodSchema =
  baseSigningObjectAttributeConditionSchema.extend({
    conditionType: z
      .literal(SigningObjectAbiAttributeConditionType)
      .default(SigningObjectAbiAttributeConditionType),
    abiValidation: abiCallValidationSchema,
  });

export type SigningObjectAbiAttributeConditionProps = z.infer<
  typeof signingObjectAbiAttributeConditionSchema
>;
