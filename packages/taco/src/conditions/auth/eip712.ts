import { z } from 'zod';

import { Condition } from '../condition';
import {
  EthAddressOrUserAddressSchema,
  OmitConditionType,
} from '../shared';

export const EIP712AuthConditionType = 'auth/eip712';

export const EIP712AuthConditionSchema = z.object({
  conditionType: z.literal(EIP712AuthConditionType).default(EIP712AuthConditionType),
  parameters: EthAddressOrUserAddressSchema,
});

export type EIP712AuthConditionProps = z.infer<typeof EIP712AuthConditionSchema>;

export class EIP712AuthCondition extends Condition {
  constructor(value: OmitConditionType<EIP712AuthConditionProps>) {
    super(EIP712AuthConditionSchema, {
      conditionType: EIP712AuthConditionType,
      ...value,
    });
  }
}
