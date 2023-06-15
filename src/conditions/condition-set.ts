import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { toJSON } from '../utils';

import { Condition } from './base';
import { ConditionContext } from './context';

export type ConditionSetJSON = {
  condition: Record<string, unknown>;
};

export class ConditionSet {
  constructor(public readonly condition: Condition) {}

  public toObj(): ConditionSetJSON {
    // TODO add version here
    const condition_json = this.condition.toObj();
    return { condition: condition_json };
  }

  public static fromObj(obj: ConditionSetJSON): ConditionSet {
    const condition = Condition.fromObj(obj.condition);
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
