import {
  CompoundConditionProps,
  compoundConditionSchema,
} from '../compound-condition';
import { Condition } from '../condition';

import { ContractConditionProps, contractConditionSchema } from './contract';
import { RpcConditionProps, rpcConditionSchema } from './rpc';
import { TimeConditionProps, timeConditionSchema } from './time';

// Exporting classes here instead of their respective schema files to
// avoid circular dependency on Condition class.

export class CompoundCondition extends Condition {
  constructor(value: CompoundConditionProps) {
    super(compoundConditionSchema, value);
  }
}

export class ContractCondition extends Condition {
  constructor(value: ContractConditionProps) {
    super(contractConditionSchema, value);
  }
}

export class RpcCondition extends Condition {
  constructor(value: RpcConditionProps) {
    super(rpcConditionSchema, value);
  }
}

export class TimeCondition extends Condition {
  constructor(value: TimeConditionProps) {
    super(timeConditionSchema, value);
  }
}

export { type ContractConditionProps, ContractConditionType } from './contract';
export { type RpcConditionProps, RpcConditionType } from './rpc';
export {
  type TimeConditionProps,
  TimeConditionType,
  TimeConditionMethod,
} from './time';
