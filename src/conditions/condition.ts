import Joi, { ValidationError } from 'joi';

export class Condition {
  public static readonly COMPARATORS = ['==', '>', '<', '>=', '<=', '!='];

  public readonly schema = Joi.object();
  public readonly defaults = {};
  private validationError?: ValidationError;

  constructor(private readonly value: Record<string, unknown> = {}) {}

  public get error(): string | undefined {
    return this.validationError?.message;
  }

  protected makeReturnValueTest() {
    return Joi.object({
      index: Joi.number().optional(),
      comparator: Joi.string()
        .valid(...Condition.COMPARATORS)
        .required(),
      value: Joi.alternatives(Joi.string(), Joi.number()).required(),
    });
  }

  public toObj(): Record<string, unknown> {
    const { error, value } = this.validate();
    if (error) {
      throw Error(error.message);
    }
    return value;
  }

  public static fromObj(obj: Record<string, unknown>) {
    return new Condition(obj);
  }

  public validate(data: Record<string, unknown> = {}) {
    const newValue = Object.assign(this.defaults, this.value, data);
    return this.schema.validate(newValue);
  }

  protected getContextParametersConfig(): Record<string, string[]> {
    // Empty configuration object by default, to be implemented by subclasses
    return {};
  }

  public getContextParameters(): string[] {
    const asObject = this.toObj();
    let paramsToCheck: string[] = [];

    const method = asObject['method'] as string;
    if (method) {
      const contextParams = this.getContextParametersConfig()[method];
      paramsToCheck = [...(contextParams ?? [])];
    }

    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;
    if (returnValueTest) {
      paramsToCheck.push(returnValueTest['value']);
    }

    paramsToCheck = [
      ...paramsToCheck,
      ...((asObject['parameters'] as string[]) ?? []),
    ];
    const withoutDuplicates = new Set(
      paramsToCheck.filter((p) => paramsToCheck.includes(p))
    );
    return [...withoutDuplicates];
  }
}
