export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context';

export {
  BlockchainReturnValueTestProps,
  ReturnValueTestProps,
  blockchainReturnValueTestSchema,
  returnValueTestSchema,
} from './schemas/return-value-test';
