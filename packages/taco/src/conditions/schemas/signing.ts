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

export const SigningObjectAttributeConditionType = 'signing-attribute';

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
      .describe('Index of parameter to check within abi calldata.'),
    subIndices: z
      .array(z.number().int().nonnegative())
      .optional()
      .describe(
        'Sequential indices for navigating nested structures (arrays and tuples). ' +
          'The ABI type determines interpretation at each step: array types consume an index ' +
          'and access that element, tuple types consume an index and access that field.',
      ),
    returnValueTest: blockchainReturnValueTestSchema
      .optional()
      .describe('Comparison check for value within calldata'),
    nestedAbiValidation: z
      .lazy(() => abiCallValidationSchema)
      .optional()
      .describe('Additional checks for nested abi calldata'),
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

function generateSolidityBaseTypeRegExp(): RegExp {
  // Generate a regex pattern for Solidity base types

  // Generate int/uint sizes (8, 16, ..., 256)
  const intSizes = Array.from({ length: 32 }, (_, i) => (i + 1) * 8); // [8, 16, ..., 256]
  const intSizePattern = intSizes.join('|');

  // Generate bytes sizes (1, 2, ..., 32)
  const bytesSizes = Array.from({ length: 32 }, (_, i) => i + 1); // [1, 2, ..., 32]
  const bytesSizePattern = bytesSizes.join('|');

  // Build the regex string
  const baseTypes = [
    `u?int(${intSizePattern})?`, // uint8, uint16, ..., uint256, int8, int16, ..., int256
    `bytes(${bytesSizePattern})?`, // bytes1, bytes2, ..., bytes32
    'string',
    'address',
    'bool',
  ].join('|');

  return new RegExp(`^(${baseTypes})$`);
}

// YIKES!
const solidityBaseTypePattern = generateSolidityBaseTypeRegExp();

const isValidSolidityType = (param: ParamType): boolean => {
  // Recursive check for valid Solidity types
  if (!param.baseType || !param.baseType.trim()) {
    return false; // empty type is not valid
  }

  // Check for arrays and tuples
  if (param.baseType === 'tuple') {
    if (!param.components || param.components.length === 0) {
      return false; // tuples must have components defined
    }
    return param.components.every(isValidSolidityType);
  } else if (param.baseType === 'array') {
    if (!param.arrayChildren) {
      return false; // arrays must have children type defined
    }
    return isValidSolidityType(param.arrayChildren);
  } else {
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

/**
 * Resolves the final ParamType after applying subIndices navigation.
 * Returns the resolved type or undefined if navigation fails (with errors added to ctx).
 *
 * @param ctx - The Zod refinement context.
 * @param paramType - The starting ParamType to navigate from.
 * @param subIndices - The array of indices to navigate through.
 * @param signature - The ABI signature (for error messages).
 * @param validationIndex - The index of the validation (for error paths).
 * @returns The resolved ParamType or undefined if validation failed.
 */
function resolveTypeWithSubIndices(
  ctx: z.RefinementCtx,
  paramType: ParamType,
  subIndices: number[],
  signature: string,
  validationIndex: number,
): ParamType | undefined {
  let currentType = paramType;

  for (let i = 0; i < subIndices.length; i++) {
    const idx = subIndices[i];

    if (currentType.baseType === 'array') {
      // Array type - navigate to element type (cannot validate bounds at schema time)
      currentType = currentType.arrayChildren;
    } else if (currentType.baseType === 'tuple') {
      // Tuple type - navigate to component at index
      if (idx >= currentType.components.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Index ${idx} at subIndices position ${i} is out of range for tuple with ${currentType.components.length} fields`,
          path: ['allowedAbiCalls', signature, validationIndex, 'subIndices'],
        });
        return undefined;
      }
      currentType = currentType.components[idx];
    } else {
      // Not an indexable type
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cannot apply index at subIndices position ${i}: type "${currentType.baseType}" is not indexable (not an array or tuple)`,
        path: ['allowedAbiCalls', signature, validationIndex, 'subIndices'],
      });
      return undefined;
    }
  }

  return currentType;
}

/**
 * Validates the allowed ABI calls against the provided signature and validations.
 * This function is used in the superRefine method of the abiCallValidationSchema.
 *
 * @param ctx - The Zod refinement context.
 * @param signature - The ABI signature to validate against.
 * @param validations - The array of validations for the ABI parameters.
 */
function validateAllowedAbiCall(
  ctx: z.RefinementCtx,
  signature: string,
  validations: AbiParameterValidationProps[],
) {
  try {
    const fragment = FunctionFragment.from(signature);
    for (const [index, validation] of validations.entries()) {
      if (validation.parameterIndex >= fragment.inputs.length) {
        // invalid parameter index
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Parameter index, "${validation.parameterIndex}", is out of range`,
          path: ['allowedAbiCalls', signature, index, 'parameterIndex'],
        });
        continue;
      }

      let finalType = fragment.inputs[validation.parameterIndex];

      // Validate and resolve subIndices if present
      if (validation.subIndices && validation.subIndices.length > 0) {
        const resolvedType = resolveTypeWithSubIndices(
          ctx,
          finalType,
          validation.subIndices,
          signature,
          index,
        );
        if (resolvedType === undefined) {
          continue; // Validation failed, errors already added
        }
        finalType = resolvedType;
      }

      if (validation.nestedAbiValidation) {
        // if there is nested ABI validation, the final type must be bytes
        if (finalType.baseType !== 'bytes') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid type for nested ABI validation, "${finalType.baseType}"; expected bytes`,
            path: ['allowedAbiCalls', signature, index],
          });
        }
      }
    }
  } catch {
    // even though abi signatures are already validated by nested schema - zod uses "greedy" (continuable) validation so all validations are run
    // ignore invalid ABI signature
  }
}

export const abiCallValidationSchema: z.ZodSchema = z
  .object({
    allowedAbiCalls: z.record(
      humanAbiCallSignatureSchema,
      z.array(abiParameterValidationSchema),
    ),
  })
  .refine(
    (abiCallValidation) =>
      Object.keys(abiCallValidation.allowedAbiCalls).length > 0,
    {
      message: 'At least one allowed ABI call must be defined',
      path: ['allowedAbiCalls'],
    },
  )
  .superRefine((data, ctx) => {
    for (const [signature, validations] of Object.entries(
      data.allowedAbiCalls,
    )) {
      validateAllowedAbiCall(ctx, signature, validations);
    }
  })
  .describe(
    'A map of allowed ABI calls with their respective parameter validations.',
  );

export type AbiCallValidationProps = z.infer<typeof abiCallValidationSchema>;

export const SigningObjectAbiAttributeConditionType = 'signing-abi-attribute';

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
