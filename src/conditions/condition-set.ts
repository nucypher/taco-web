import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ConditionContext } from './condition-context';
import { Condition } from './conditions';
import { Operator } from './operator';

export class ConditionSet {
  constructor(
    public readonly conditions: ReadonlyArray<Condition | Operator>
  ) {}

  public validate() {
    if (this.conditions.length % 2 === 0) {
      throw new Error(
        'conditions must be odd length, ever other element being an operator'
      );
    }
    this.conditions.forEach((cnd: Condition | Operator, index) => {
      if (index % 2 && cnd.constructor.name !== 'Operator')
        throw new Error(
          `${index} element must be an Operator; Got ${cnd.constructor.name}.`
        );
      if (!(index % 2) && cnd.constructor.name === 'Operator')
        throw new Error(
          `${index} element must be a Condition; Got ${cnd.constructor.name}.`
        );
    });
    return true;
  }

  public toList() {
    return this.conditions.map((cnd) => {
      return cnd.toObj();
    });
  }

  public static fromList(list: ReadonlyArray<Record<string, string>>) {
    return new ConditionSet(
      list.map((ele: Record<string, string>) => {
        if ('operator' in ele) return Operator.fromObj(ele);
        return Condition.fromObj(ele);
      })
    );
  }

  public toJson() {
    return JSON.stringify(this.toList());
  }

  public static fromJSON(json: string) {
    return ConditionSet.fromList(JSON.parse(json));
  }

  public toWASMConditions() {
    return new WASMConditions(this.toJson());
  }

  public buildContext(
    provider: ethers.providers.Web3Provider
  ): ConditionContext {
    return new ConditionContext(this.toWASMConditions(), provider);
  }
}