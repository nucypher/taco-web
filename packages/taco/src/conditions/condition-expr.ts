import { Conditions as CoreConditions } from '@nucypher/nucypher-core';
import { SemVer } from 'semver';

import { fromJSON, toJSON } from '../utils.js';

import { ConditionFactory } from './condition-factory.js';
import { Condition } from './condition.js';

const ERR_VERSION = (provided: string, current: string) =>
  `Version provided, ${provided}, is incompatible with current version, ${current}`;
const ERR_CONDITION = (condition: Record<string, unknown>) =>
  `Invalid condition: unrecognized condition data ${toJSON(condition)}`;

export type ConditionExpressionJSON = {
  version: string;
  condition: Record<string, unknown>;
};

export class ConditionExpression {
  public static version = '1.0.0';

  constructor(
    public readonly condition: Condition,
    public readonly version: string = ConditionExpression.version,
  ) {}

  public toObj(): ConditionExpressionJSON {
    const condition = this.condition.toObj();
    return {
      version: this.version,
      condition,
    };
  }

  public static fromObj(obj: ConditionExpressionJSON): ConditionExpression {
    const receivedVersion = new SemVer(obj.version);
    const currentVersion = new SemVer(ConditionExpression.version);
    if (receivedVersion.major > currentVersion.major) {
      throw new Error(ERR_VERSION(obj.version, ConditionExpression.version));
    }

    if (!obj.condition) {
      throw new Error(ERR_CONDITION(obj.condition));
    }

    const condition = ConditionFactory.conditionFromProps(obj.condition);
    return new ConditionExpression(condition, obj.version);
  }

  public toJson(): string {
    return toJSON(this.toObj());
  }

  public static fromJSON(json: string): ConditionExpression {
    return ConditionExpression.fromObj(fromJSON(json));
  }

  public toCoreCondition(): CoreConditions {
    return new CoreConditions(toJSON(this.toObj()));
  }

  public static fromCoreConditions(conditions: CoreConditions) {
    return ConditionExpression.fromJSON(conditions.toString());
  }

  public equals(other: ConditionExpression): boolean {
    return [
      this.version === other.version,
      this.condition.equals(other.condition),
    ].every(Boolean);
  }
}
