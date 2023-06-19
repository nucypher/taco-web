import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { objectEquals, toJSON } from '../utils';

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
    // TODO add version here
    const conditionData = this.condition.toObj();
    return {
      version: this.version,
      condition: conditionData,
    };
  }

  public static fromObj(obj: ConditionExpressionJSON): ConditionExpression {
    const version = obj.version;
    // version specific logic can go here
    const receivedMajorVersion = version.split('.')[0];
    const currentMajorVersion = ConditionExpression.VERSION.split('.')[0];
    if (receivedMajorVersion > currentMajorVersion) {
      throw new Error(
        `Version provided, ${version}, is incompatible with current version, ${ConditionExpression.VERSION}`
      );
    }

    const underlyingConditionData = obj.condition;

    if (underlyingConditionData.operator) {
      return new ConditionExpression(
        new CompoundCondition(underlyingConditionData),
        version
      );
    }

    if (underlyingConditionData.method) {
      if (underlyingConditionData.method === BLOCKTIME_METHOD) {
        return new ConditionExpression(
          new TimeCondition(underlyingConditionData),
          version
        );
      }

      if (underlyingConditionData.contractAddress) {
        return new ConditionExpression(
          new ContractCondition(underlyingConditionData),
          version
        );
      }

      if ((underlyingConditionData.method as string).startsWith('eth_')) {
        return new ConditionExpression(
          new RpcCondition(underlyingConditionData),
          version
        );
      }
    }

    throw new Error('Invalid condition: unrecognized condition data');
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
    provider: ethers.providers.Web3Provider
  ): ConditionContext {
    return new ConditionContext([this.condition], provider);
  }

  public equals(other: ConditionExpression): boolean {
    return (
      this.version === other.version &&
      objectEquals(this.condition.toObj(), other.condition.toObj())
    );
  }
}
