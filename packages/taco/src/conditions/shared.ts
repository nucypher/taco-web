export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context';

export {
  NonFloatReturnValueTestProps,
  ReturnValueTestProps,
  nonFloatReturnValueTestSchema,
  returnValueTestSchema,
} from './schemas/return-value-test';
