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

export type ConditionSetJSON = {
  condition: Record<string, unknown>;
};

export class ConditionSet {
  constructor(public readonly condition: Condition) {}

  public toObj(): ConditionSetJSON {
    // TODO add version here
    const conditionData = this.condition.toObj();
    return { condition: conditionData };
  }

  public static fromObj(obj: ConditionSetJSON): ConditionSet {
    // version specific logic can go here
    const underlyingConditionData = obj.condition;

    if (underlyingConditionData.operator) {
      return new ConditionSet(new CompoundCondition(underlyingConditionData));
    }

    if (underlyingConditionData.method) {
      if (underlyingConditionData.method === BLOCKTIME_METHOD) {
        return new ConditionSet(new TimeCondition(underlyingConditionData));
      }

      if (underlyingConditionData.contractAddress) {
        return new ConditionSet(new ContractCondition(underlyingConditionData));
      }

      if ((underlyingConditionData.method as string).startsWith('eth_')) {
        return new ConditionSet(new RpcCondition(underlyingConditionData));
      }
    }

    throw new Error('Invalid condition: unrecognized condition data');
  }

  public toJson(): string {
    return toJSON(this.toObj());
  }

  public static fromJSON(json: string): ConditionSet {
    return ConditionSet.fromObj(JSON.parse(json));
  }

  public toWASMConditions(): WASMConditions {
    return new WASMConditions(toJSON(this.toObj()));
  }

  public buildContext(
    provider: ethers.providers.Web3Provider
  ): ConditionContext {
    return new ConditionContext([this.condition], provider);
  }

  public equals(other: ConditionSet): boolean {
    return objectEquals(this.condition.toObj(), other.condition.toObj());
  }
}
