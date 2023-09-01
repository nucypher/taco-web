import { z } from 'zod';

import { objectEquals } from '../utils';

import {
  CompoundCondition,
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
  RpcCondition,
  RpcConditionProps,
  RpcConditionType,
  TimeCondition,
  TimeConditionProps,
  TimeConditionType,
} from './base';
import {
  CompoundConditionProps,
  CompoundConditionType,
} from './compound-condition';
import { USER_ADDRESS_PARAM } from './const';

type ConditionSchema = z.ZodSchema;
export type ConditionProps = z.infer<ConditionSchema>;

class ConditionFactory {
  public static conditionFromProps(obj: ConditionProps): Condition {
    switch (obj.conditionType) {
      case RpcConditionType:
        return new RpcCondition(obj as RpcConditionProps);
      case TimeConditionType:
        return new TimeCondition(obj as TimeConditionProps);
      case ContractConditionType:
        return new ContractCondition(obj as ContractConditionProps);
      case CompoundConditionType:
        return new CompoundCondition(obj as CompoundConditionProps);
      default:
        throw new Error(`Invalid conditionType: ${obj.conditionType}`);
    }
  }
}

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

  public static fromObj(obj: ConditionProps): Condition {
    return ConditionFactory.conditionFromProps(obj);
  }

  public equals(other: Condition) {
    return objectEquals(this, other);
  }
}
