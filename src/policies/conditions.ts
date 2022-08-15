import { base64 } from 'ethers/lib/utils';
import Joi from 'joi';

class Operator {
  static operators: Array<string> = ['and', 'or'];

  constructor(public operator: string) {
    if (!Operator.operators.includes(operator)) {
      throw `"${operator}" is not a valid operator`;
    }
    this.operator = operator;
  }

  toObj() {
    return { operator: this.operator };
  }

  static fromObj(obj: any) {
    return new Operator(obj.operator);
  }
}

class ConditionSet {
  constructor(public conditions: Array<Condition | Operator>) {}

  validate() {
    if (this.conditions.length % 2 === 0) {
      throw 'conditions must be odd length, ever other element being an operator';
    }
    this.conditions.forEach((cnd: Condition | Operator, index) => {
      if (index % 2 && cnd.constructor.name !== 'Operator')
        throw `${index} element must be an Operator; Got ${cnd.constructor.name}.`;
      if (!(index % 2) && cnd.constructor.name === 'Operator')
        throw `${index} element must be a Condition; Got ${cnd.constructor.name}.`;
    });
    return true;
  }

  toList() {
    return this.conditions.map((cnd) => {
      return cnd.toObj();
    });
  }

  toJSON() {
    return JSON.stringify(this.toList());
  }

  toBase64() {
    return this.toBuffer().toString('base64');
  }

  toBuffer() {
    return Buffer.from(this.toJSON());
  }

  static fromBytes(bytes: Uint8Array) {
    const decoded = Buffer.from(Buffer.from(bytes).toString('ascii'), 'base64');
    const asList = JSON.parse(String.fromCharCode(...decoded));

    return new ConditionSet(
      asList.map((ele: any) => {
        if ('operator' in ele) return Operator.fromObj(ele);
        return Condition.fromObj(ele);
      })
    );
  }
}

class Condition {
  defaults = {};
  state = {};

  error: any = {};
  value: any = {};

  toObj() {
    return this.validate().value;
  }

  static fromObj(obj: any) {
    return new ContractCondition(obj);
  }

  schema = Joi.object({});

  validate(data: Record<string, unknown> = {}) {
    this.state = Object.assign(this.defaults, this.state, data);
    const { error, value } = this.schema.validate(this.state);
    this.error = error;
    this.value = value;
    return { error, value };
  }

  constructor(data: Record<string, unknown> = {}) {
    this.validate(data);
  }
}

class RPCcondition extends Condition {
  schema = Joi.object({
    chain: Joi.string().required(),

    method: Joi.string().valid('balanceOf', 'eth_getBalance').required(),

    parameters: Joi.array(),

    returnValueTest: Joi.object({
      comparator: Joi.string().valid('==', '>', '<', '<=', '>=').required(),
      value: Joi.string(),
    }),
  });
}

class ContractCondition extends Condition {
  schema = Joi.object({
    contractAddress: Joi.string().pattern(new RegExp('^0x[a-fA-F0-9]{40}$')),

    chain: Joi.string().required(),

    standardContractType: Joi.string(),

    functionAbi: Joi.string(),

    method: Joi.string(),

    parameters: Joi.array(),

    returnValueTest: Joi.object({
      comparator: Joi.string().valid('==', '>', '<', '<=', '>=').required(),
      value: Joi.string(),
    }),
  });
}

class ERC721Ownership extends ContractCondition {
  defaults = {
    chain: 'ethereum',
    method: 'ownerOf',
    parameters: [],
    standardContractType: 'ERC721',
    returnValueTest: {
      comparator: '==',
      value: ':userAddress',
    },
  };
}

const Conditions = {
  ERC721Ownership,
};

export { Operator, ConditionSet, Conditions };
