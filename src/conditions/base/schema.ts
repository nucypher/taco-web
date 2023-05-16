import Joi from 'joi';

const COMPARATORS = ['==', '>', '<', '>=', '<=', '!='];

export interface ReturnValueTestConfig {
  index?: number;
  comparator: string;
  value: string | number;
}

export const makeReturnValueTest =
  (): Joi.ObjectSchema<ReturnValueTestConfig> =>
    Joi.object({
      index: Joi.number().optional(),
      comparator: Joi.string()
        .valid(...COMPARATORS)
        .required(),
      value: Joi.alternatives(Joi.string(), Joi.number()).required(),
    });

// A helper method for making complex Joi types
// It says "allow these `types` when `parent` value is given"
export const makeWhenGuard = (
  schema: Joi.StringSchema | Joi.ArraySchema,
  types: Record<string, string[]>,
  parent: string
) => {
  Object.entries(types).forEach(([key, value]) => {
    schema = schema.when(parent, {
      is: key,
      then: value,
    });
  });
  return schema;
};
