import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { SemVer } from 'semver';
import { WalletClient } from 'viem';

import { objectEquals, toBytes, toJSON } from '../utils';

import {
  Condition,
  ContractCondition,
  RpcCondition,
  TimeCondition,
} from './base';
import { BLOCKTIME_METHOD } from './base/time';
import { CompoundCondition } from './compound-condition';
import { ConditionContext } from './context';

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
    const conditionData = this.condition.toObj();
    return {
      version: this.version,
      condition: conditionData,
    };
  }

  public static fromObj(obj: ConditionExpressionJSON): ConditionExpression {
    const receivedVersion = new SemVer(obj.version);
    const currentVersion = new SemVer(ConditionExpression.VERSION);
    if (receivedVersion.major > currentVersion.major) {
      throw new Error(
        `Version provided, ${obj.version}, is incompatible with current version, ${ConditionExpression.VERSION}`
      );
    }

    const underlyingConditionData = obj.condition;
    let condition: Condition | undefined;

    if (underlyingConditionData.operator) {
      condition = new CompoundCondition(underlyingConditionData);
    } else if (underlyingConditionData.method) {
      if (underlyingConditionData.method === BLOCKTIME_METHOD) {
        condition = new TimeCondition(underlyingConditionData);
      } else if (underlyingConditionData.contractAddress) {
        condition = new ContractCondition(underlyingConditionData);
      } else if (
        (underlyingConditionData.method as string).startsWith('eth_')
      ) {
        condition = new RpcCondition(underlyingConditionData);
      }
    }

    if (!condition) {
      throw new Error(
        `Invalid condition: unrecognized condition data ${JSON.stringify(
          underlyingConditionData
        )}`
      );
    }

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

  public buildContext(walletClient: WalletClient): ConditionContext {
    return new ConditionContext([this.condition], walletClient);
  }

  public asAad(): Uint8Array {
    return toBytes(this.toJson());
  }

  public equals(other: ConditionExpression): boolean {
    return [
      this.version === other.version,
      objectEquals(this.condition.toObj(), other.condition.toObj()),
    ].every(Boolean);
  }
}
