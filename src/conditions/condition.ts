import { z } from 'zod';

import { objectEquals } from '../utils';

import {
  CompoundCondition,
  ContractCondition,
  ContractConditionProps,
  RpcCondition,
  RpcConditionProps,
  TimeCondition,
  TimeConditionProps,
} from './base';
import { CompoundConditionProps } from './compound-condition';
import { USER_ADDRESS_PARAM } from './const';

type ConditionSchema = z.ZodSchema;
export type ConditionProps = z.infer<ConditionSchema>;

export class Condition {
  constructor(
    public readonly schema: ConditionSchema,
    public readonly value: ConditionProps
  ) {
    const { data, error } = Condition.validate(schema, value);
    if (error) {
      throw new Error(`Invalid condition: ${JSON.stringify(error.issues)}`);
    }
    this.value = data;
  }

  public static validate(
    schema: ConditionSchema,
    value: ConditionProps
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

  public requiresSigner(): boolean {
    return JSON.stringify(this.value).includes(USER_ADDRESS_PARAM);
  }

  public toObj() {
    const { data, error } = Condition.validate(this.schema, this.value);
    if (error) {
      throw new Error(`Invalid condition: ${JSON.stringify(error.issues)}`);
    }
    return data;
  }

  private static conditionFromObject(obj: ConditionProps): Condition {
    switch (obj.conditionType) {
      case 'rpc':
        return new RpcCondition(obj as RpcConditionProps);
      case 'time':
        return new TimeCondition(obj as TimeConditionProps);
      case 'contract':
        return new ContractCondition(obj as ContractConditionProps);
      case 'compound':
        return new CompoundCondition(obj as CompoundConditionProps);
      default:
        throw new Error(`Invalid conditionType: ${obj.conditionType}`);
    }
  }

  public static fromObj(obj: ConditionProps): Condition {
    return Condition.conditionFromObject(obj);
  }

  public equals(other: Condition) {
    return objectEquals(this, other);
  }
}
