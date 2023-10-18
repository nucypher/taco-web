import Joi from 'joi';

import { objectEquals } from '../../utils';

type Map = Record<string, unknown>;

export class Condition {
  public readonly schema = Joi.object();
  public readonly defaults: Map = {};

  constructor(private readonly value: Record<string, unknown> = {}) {}

  public validate(override: Map = {}) {
    const newValue = {
      ...this.defaults,
      ...this.value,
      ...override,
    };
    return this.schema.validate(newValue);
  }

  public toObj(): Map {
    const { error, value } = this.validate(this.value);
    if (error) {
      throw `Invalid condition: ${error.message}`;
    }
    return {
      ...value,
    };
  }

  public static fromObj<T extends Condition>(
    // We disable the eslint rule here because we have to pass args to the constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this: new (...args: any[]) => T,
    obj: Map
  ): T {
    return new this(obj);
  }

  public equals(other: Condition) {
    return objectEquals(this, other);
  }
}
