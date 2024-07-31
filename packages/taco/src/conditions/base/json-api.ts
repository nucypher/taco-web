import { z } from 'zod';

import { Condition } from '../condition';
import { OmitConditionType, returnValueTestSchema } from '../shared';

export const JsonApiConditionType = 'json-api';

function tokenize(expression: string): string[] {
  const regex =
    /(\$|@|\.\.|\.|[[\]]|\?|\(|\)|==|!=|<=|>=|<|>|&&|\|\||[a-zA-Z_][\w]*|\d+|'[^']*')/g;
  return expression.match(regex) || [];
}

function validateJSONPath(expression: string): boolean {
  const tokens = tokenize(expression);

  let depth = 0;
  let inBracket = false;
  let inFilter = false;
  let lastTokenWasCloseBracket = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '$' && i !== 0) return false; // $ only at the beginning
    if (token === '@' && !inFilter) return false; // @ only in filters

    if (token === '[') {
      if (lastTokenWasCloseBracket) return false; // Don't allow [...][]
      depth++;
      inBracket = true;
      lastTokenWasCloseBracket = false;
    } else if (token === ']') {
      if (depth === 0) return false;
      depth--;
      inBracket = false;
      lastTokenWasCloseBracket = true;
    } else {
      lastTokenWasCloseBracket = false;
    }

    if (token === '?') {
      if (!inBracket) return false;
      inFilter = true;
    } else if (token === '(') {
      if (!inFilter) return false;
    } else if (token === ')') {
      if (!inFilter) return false;
      inFilter = false;
    }

    // Check for valid operators in filters
    if (
      inFilter &&
      ['==', '!=', '<', '<=', '>', '>=', '&&', '||'].includes(token)
    ) {
      if (i === 0 || i === tokens.length - 1) return false;
    }

    // Check that there are no two consecutive dots outside brackets
    if (token === '.' && i > 0 && tokens[i - 1] === '.' && !inBracket)
      return false;
  }

  if (depth !== 0) return false; // Unclosed brackets
  if (inFilter) return false; // Unclosed filter

  return true;
}

export const jsonPathSchema = z
  .string()
  .refine((val) => validateJSONPath(val), {
    message: 'Invalid JSONPath expression',
  });

export const JsonApiConditionSchema = z.object({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: z.string().url(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  query: jsonPathSchema.optional(),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type JsonApiConditionProps = z.infer<typeof JsonApiConditionSchema>;

export class JsonApiCondition extends Condition {
  constructor(value: OmitConditionType<JsonApiConditionProps>) {
    super(JsonApiConditionSchema, {
      conditionType: JsonApiConditionType,
      ...value,
    });
  }
}
