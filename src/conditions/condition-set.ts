import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { toJSON } from '../utils';

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
    let condition = undefined;
    if (underlyingConditionData.operator) {
      condition = new CompoundCondition(underlyingConditionData);
    } else if (underlyingConditionData.method) {
      if (underlyingConditionData.method == BLOCKTIME_METHOD) {
        condition = new TimeCondition(underlyingConditionData);
      } else if (underlyingConditionData.contractAddress) {
        condition = new ContractCondition(underlyingConditionData);
      } else if (
        (underlyingConditionData.method as string).startsWith('eth_')
      ) {
        condition = new RpcCondition(underlyingConditionData);
      }
    }
    if (condition == undefined) {
      throw `Invalid condition: unrecognized condition data`;
    }

    return new ConditionSet(condition);
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
    return this.condition.equals(other.condition);
  }
}
