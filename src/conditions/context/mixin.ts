import { ConditionInterface } from '../base/condition';

// Disabling because mixin constructor requires any arguments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<TResult, TParams extends any[] = any[]> = new (
  ...params: TParams
) => TResult;

export function ContextParametersHandlerMixin<
  TBase extends Constructor<ConditionInterface>
>(Base: TBase) {
  return class extends Base {
    // Disabling because mixin constructor requires any arguments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      super(...args);
    }

    public getContextParameters(): string[] {
      const asObject = this.toObj();
      const method = asObject['method'] as string;
      const parameters = (asObject['parameters'] ?? []) as string[];
      const context = this.getContextConfig()[method];

      const returnValueTest = asObject['returnValueTest'] as Record<
        string,
        string
      >;
      const maybeParams = [...(context ?? []), returnValueTest['value']];
      return parameters.filter((p) => maybeParams.includes(p));
    }

    public getContextConfig(): Record<string, string[]> {
      // Empty configuration object by default
      return {};
    }
  };
}
