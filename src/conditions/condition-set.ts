import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import deepEqual from 'deep-equal';
import { ethers } from 'ethers';

import { toJSON } from '../utils';

import { Condition } from './base';
import { ConditionContext } from './context';
import { Operator } from './operator';

type ConditionOrOperator = Condition | Operator;

export type ConditionSetJSON = {
  conditions: ({ operator: string } | Record<string, unknown>)[];
};

export class ConditionSet {
  constructor(public readonly conditions: ReadonlyArray<ConditionOrOperator>) {}

  public validate() {
    // Expects [Condition, Operator, Condition, Operator, ...], where the last element is a Condition

    if (this.conditions.length % 2 === 0) {
      throw new Error(
        'conditions must be odd length, every other element being an operator'
      );
    }

    this.conditions.forEach((cndOrOp: ConditionOrOperator, index) => {
      if (index % 2 && !(cndOrOp instanceof Operator)) {
        throw new Error(
          `index ${index} must be an Operator, got ${cndOrOp.constructor.name} instead`
        );
      }
      if (!(index % 2) && cndOrOp instanceof Operator) {
        throw new Error(
          `index ${index} must be a Condition, got ${cndOrOp.constructor.name} instead`
        );
      }
    });
    return true;
  }

  public toObj(): ConditionSetJSON {
    const conditions = this.conditions.map((cnd) => cnd.toObj());
    return { conditions };
  }

  public static fromObj(obj: ConditionSetJSON): ConditionSet {
    const conditions = obj.conditions.map((cnd) => {
      if ('operator' in cnd) {
        return Operator.fromObj(cnd as Record<string, string>);
      }
      return Condition.fromObj(cnd);
    });
    return new ConditionSet(conditions);
  }

  public static fromConditionList(list: ReadonlyArray<Record<string, string>>) {
    return new ConditionSet(
      list.map((ele: Record<string, string>) => {
        if ('operator' in ele) return Operator.fromObj(ele);
        return Condition.fromObj(ele);
      })
    );
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
    return new ConditionContext(this.toWASMConditions(), provider);
  }

  public equals(other: ConditionSet): boolean {
    // TODO: This is a hack to make the equals method work for Condition
    // TODO: Implement proper casting from Conditon to _class type
    const thisConditions = this.conditions.map((cnd) => {
      const asObj = cnd.toObj();
      delete asObj._class;
      return asObj;
    });
    const otherConditions = other.conditions.map((cnd) => {
      const asObj = cnd.toObj();
      delete asObj._class;
      return asObj;
    });
    return deepEqual(thisConditions, otherConditions);
  }
}
