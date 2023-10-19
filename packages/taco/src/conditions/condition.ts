import { objectEquals } from '@nucypher/shared';
import { z } from 'zod';

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

const ERR_INVALID_CONDITION = (error: z.ZodError) =>
  `Invalid condition: ${JSON.stringify(error.issues)}`;
const ERR_INVALID_CONDITION_TYPE = (type: string) =>
  `Invalid condition type: ${type}`;

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
        throw new Error(ERR_INVALID_CONDITION_TYPE(obj.conditionType));
    }
  }
}

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

  public requiresSigner(): boolean {
    return JSON.stringify(this.value).includes(USER_ADDRESS_PARAM);
  }

  public toObj() {
    const { data, error } = Condition.validate(this.schema, this.value);
    if (error) {
      throw new Error(ERR_INVALID_CONDITION(error));
    }
    return data;
  }

  public static fromObj(obj: ConditionProps): Condition {
    return ConditionFactory.conditionFromProps(obj);
  }

  public equals(other: Condition) {
    return objectEquals(this.toObj(), other.toObj());
  }
}
