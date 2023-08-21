import { z } from 'zod';

import { objectEquals } from '../utils';

import {
  ContractConditionProps,
  RpcConditionProps,
  TimeConditionProps,
} from './base';
import { CompoundConditionProps } from './compound-condition';
import { USER_ADDRESS_PARAM } from './const';

// Not using discriminated union because of inconsistent Zod types
// Some conditions have ZodEffect types because of .refine() calls
export type ConditionProps =
  | RpcConditionProps
  | TimeConditionProps
  | ContractConditionProps
  | CompoundConditionProps;

export class Condition {
  constructor(
    public readonly schema: z.ZodSchema,
    public readonly value:
      | RpcConditionProps
      | TimeConditionProps
      | ContractConditionProps
      | CompoundConditionProps
  ) {}

  public validate(override: Partial<ConditionProps> = {}): {
    data?: ConditionProps;
    error?: z.ZodError;
  } {
    const newValue = {
      ...this.value,
      ...override,
    };
    const result = this.schema.safeParse(newValue);
    if (result.success) {
      return { data: result.data };
    }
    return { error: result.error };
  }

  public requiresSigner(): boolean {
    return JSON.stringify(this.value).includes(USER_ADDRESS_PARAM);
  }

  public toObj() {
    const { data, error } = this.validate(this.value);
    if (error) {
      throw new Error(`Invalid condition: ${JSON.stringify(error.issues)}`);
    }
    return data;
  }

  public static fromObj<T extends Condition>(
    this: new (...args: unknown[]) => T,
    obj: Record<string, unknown>
  ): T {
    return new this(obj);
  }

  public equals(other: Condition) {
    return objectEquals(this, other);
  }
}
