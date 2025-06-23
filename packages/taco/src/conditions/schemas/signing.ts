import { FunctionFragment } from 'ethers/lib/utils';
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
    attribute_name: z.string().describe('The name of the attribute to check'),
  },
);

export const SigningObjectAttributeConditionType = 'attribute';

export const signingObjectAttributeConditionSchema: z.ZodSchema =
  baseSigningObjectAttributeConditionSchema.extend({
    conditionType: z
      .literal(SigningObjectAttributeConditionType)
      .default(SigningObjectAttributeConditionType),
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

const isValidFunctionSignature = (signature: string): boolean => {
  try {
    // TODO: verify this works properly
    const fragment = FunctionFragment.from(signature);
    return fragment.format() === signature; // ensure the same sighash format was provided
  } catch (error) {
    return false;
  }
};

export const abiCallValidationSchema: z.ZodSchema = z
  .object({
    allowedAbiCalls: z.record(
      z.string(),
      z.array(abiParameterValidationSchema),
    ),
  })
  .refine(
    (abiCallValidation) => {
      // validate human readable abi signature
      const keys = Object.keys(abiCallValidation.allowedAbiCalls);
      keys.forEach((abiSignature) => {
        if (!isValidFunctionSignature(abiSignature)) {
          return false;
        }
      });
      return true;
    },
    {
      message: 'Invalid ABI signature provided',
    },
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
