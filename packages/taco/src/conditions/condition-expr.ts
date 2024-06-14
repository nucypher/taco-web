import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { toJSON } from '@nucypher/shared';
import {AuthProviders} from "@nucypher/taco-auth";
import { SemVer } from 'semver';

import { Condition } from './condition';
import { ConditionFactory } from './condition-factory';
import { ConditionContext, CustomContextParam} from './context';

const ERR_VERSION = (provided: string, current: string) =>
  `Version provided, ${provided}, is incompatible with current version, ${current}`;
const ERR_CONDITION = (condition: Record<string, unknown>) =>
  `Invalid condition: unrecognized condition data ${JSON.stringify(condition)}`;

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
    return ConditionExpression.fromObj(JSON.parse(json));
  }

  public toWASMConditions(): WASMConditions {
    return new WASMConditions(toJSON(this.toObj()));
  }

  public static fromWASMConditions(conditions: WASMConditions) {
    return ConditionExpression.fromJSON(conditions.toString());
  }

  public buildContext(
    customParameters: Record<string, CustomContextParam> = {},
    authProviders: AuthProviders = {},
  ): ConditionContext {
    return new ConditionContext(
      this.condition,
      customParameters,
      authProviders,
    );
  }

  public contextRequiresAuthentication(): boolean {
    return this.condition.requiresAuthentication();
  }

  public equals(other: ConditionExpression): boolean {
    return [
      this.version === other.version,
      this.condition.equals(other.condition),
    ].every(Boolean);
  }
}
