import Joi from 'joi';

import { Condition } from './base/condition';
import { contractConditionSchema } from './base/contract';
import { rpcConditionSchema } from './base/rpc';
import { timeConditionSchema } from './base/time';

const OR_OPERATOR = 'or';
const AND_OPERATOR = 'and';

const LOGICAL_OPERATORS = [AND_OPERATOR, OR_OPERATOR];

export const compoundConditionSchema = Joi.object({
  operator: Joi.string()
    .valid(...LOGICAL_OPERATORS)
    .required(),
  operands: Joi.array()
    .min(2)
    .items(
      rpcConditionSchema,
      timeConditionSchema,
      contractConditionSchema,
      Joi.link('#compoundCondition')
    )
    .required()
    .valid(),
}).id('compoundCondition');

export class CompoundCondition extends Condition {
  public readonly schema = compoundConditionSchema;
}
