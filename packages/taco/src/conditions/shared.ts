export type OmitConditionType<T> = Omit<T, 'conditionType'>;

export {
  contextParamSchema,
  paramOrContextParamSchema,
} from './schemas/context';

export {
  ReturnValueTestProps,
  returnValueTestSchema,
} from './schemas/return-value-test';
