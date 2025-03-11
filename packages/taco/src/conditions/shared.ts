export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context';

export {
  ReturnValueTestProps,
  RpcReturnValueTestProps,
  returnValueTestSchema,
  rpcReturnValueTestSchema,
} from './schemas/return-value-test';
