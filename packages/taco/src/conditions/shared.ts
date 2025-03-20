export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context';

export {
  BlockchainReturnValueTestProps as NonFloatReturnValueTestProps,
  ReturnValueTestProps,
  blockchainReturnValueTestSchema as nonFloatReturnValueTestSchema,
  returnValueTestSchema,
} from './schemas/return-value-test';
