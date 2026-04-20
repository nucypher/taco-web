export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context.js';

export {
  BlockchainReturnValueTestProps,
  ReturnValueTestProps,
  blockchainReturnValueTestSchema,
  returnValueTestSchema,
} from './schemas/return-value-test.js';
