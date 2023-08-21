import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';
import { SemVer } from 'semver';

import { toBytes, toJSON } from '../utils';

import {
  CompoundCondition,
  ContractCondition,
  ContractConditionProps,
  RpcCondition,
  RpcConditionProps,
  TimeCondition,
  TimeConditionProps,
} from './base';
import { CompoundConditionProps } from './compound-condition';
import { Condition, ConditionProps } from './condition';
import { ConditionContext, CustomContextParam } from './context';

export type ConditionExpressionJSON = {
  version: string;
  condition: Record<string, unknown>;
};

export class ConditionExpression {
  static VERSION = '1.0.0';

  constructor(
    public readonly condition: Condition,
    public readonly version: string = ConditionExpression.VERSION
  ) {}

  public toObj(): ConditionExpressionJSON {
    const condition = this.condition.toObj();
    return {
      version: this.version,
      condition,
    };
  }

  private static conditionFromObject(obj: ConditionProps): Condition {
    switch (obj.conditionType) {
      case 'rpc':
        return new RpcCondition(obj as RpcConditionProps);
      case 'time':
        return new TimeCondition(obj as TimeConditionProps);
      case 'contract':
        return new ContractCondition(obj as ContractConditionProps);
      case 'compound':
        return new CompoundCondition(obj as CompoundConditionProps);
      default:
        throw new Error(`Invalid conditionType: ${obj.conditionType}`);
    }
  }

  public static fromObj(obj: ConditionExpressionJSON): ConditionExpression {
    const receivedVersion = new SemVer(obj.version);
    const currentVersion = new SemVer(ConditionExpression.VERSION);
    if (receivedVersion.major > currentVersion.major) {
      throw new Error(
        `Version provided, ${obj.version}, is incompatible with current version, ${ConditionExpression.VERSION}`
      );
    }

    if (!obj.condition) {
      throw new Error(
        `Invalid condition: unrecognized condition data ${JSON.stringify(
          obj.condition
        )}`
      );
    }

    const condition = this.conditionFromObject(obj.condition as ConditionProps);
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

  public buildContext(
    provider: ethers.providers.Provider,
    customParameters: Record<string, CustomContextParam> = {},
    signer?: ethers.Signer
  ): ConditionContext {
    return new ConditionContext(
      provider,
      [this.condition],
      customParameters,
      signer
    );
  }

  public contextRequiresSigner(): boolean {
    return this.condition.requiresSigner();
  }

  public asAad(): Uint8Array {
    return toBytes(this.toJson());
  }

  public equals(other: ConditionExpression): boolean {
    return [
      this.version === other.version,
      this.condition.equals(other.condition),
    ].every(Boolean);
  }
}
