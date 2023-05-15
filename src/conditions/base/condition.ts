import Joi, { ValidationError } from 'joi';

const COMPARATORS = ['==', '>', '<', '>=', '<=', '!='];

export interface ReturnValueTestConfig {
  index?: number;
  comparator: string;
  value: string | number;
}

export const makeReturnValueTest =
  (): Joi.ObjectSchema<ReturnValueTestConfig> =>
    Joi.object({
      index: Joi.number().optional(),
      comparator: Joi.string()
        .valid(...COMPARATORS)
        .required(),
      value: Joi.alternatives(Joi.string(), Joi.number()).required(),
    });

// TODO: Consider turning this into an abstract class
export class Condition {
  // No schema by default, i.e. no validation by default
  public readonly schema = Joi.object();
  public readonly defaults: Record<string, unknown> = {};
  private validationError?: ValidationError;

  constructor(private readonly value: Record<string, unknown> = {}) {}

  public get error(): string | undefined {
    return this.validationError?.message;
  }

  public toObj(): Record<string, unknown> {
    const { error, value } = this.validate();
    if (error) {
      throw Error(error.message);
    }
    return value;
  }

  public static fromObj<T extends Condition>(
    // We disable the eslint rule here because we have to pass args to the constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this: new (...args: any[]) => T,
    obj: Record<string, unknown>
  ): T {
    return new this(obj);
  }

  public validate(data: Record<string, unknown> = {}) {
    const newValue = Object.assign(this.defaults, this.value, data);
    return this.schema.validate(newValue);
  }
}
