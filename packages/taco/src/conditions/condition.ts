import { objectEquals } from '@nucypher/shared';
import { z } from 'zod';

import { USER_ADDRESS_PARAMS, USER_ADDRESS_PARAM_DEFAULT } from './const';

type ConditionSchema = z.ZodSchema;
export type ConditionProps = z.infer<ConditionSchema>;

const ERR_INVALID_CONDITION = (error: z.ZodError) =>
  `Invalid condition: ${JSON.stringify(error.issues)}`;

export class Condition {
  constructor(
    public readonly schema: ConditionSchema,
    public readonly value: ConditionProps,
  ) {
    const { data, error } = Condition.validate(schema, value);
    if (error) {
      throw new Error(ERR_INVALID_CONDITION(error));
    }
    this.value = data;
  }

  public static validate(
    schema: ConditionSchema,
    value: ConditionProps,
  ): {
    data?: ConditionProps;
    error?: z.ZodError;
  } {
    const result = schema.safeParse(value);
    if (result.success) {
      return { data: result.data };
    }
    return { error: result.error };
  }

  // TODO: Fix this method and add a test for it
  public findParamWithSigner(): string | null {
    const serialized = JSON.stringify(this.value);
    USER_ADDRESS_PARAMS.forEach(param => {
      if (serialized.includes(param)) {
        return param;
      }
    })
    return null;
  }

  public requiresSigner(): boolean {
    return Boolean(this.findParamWithSigner)
  }

  public toObj() {
    const { data, error } = Condition.validate(this.schema, this.value);
    if (error) {
      throw new Error(ERR_INVALID_CONDITION(error));
    }
    return data;
  }

  public equals(other: Condition) {
    return objectEquals(this.toObj(), other.toObj());
  }
}
