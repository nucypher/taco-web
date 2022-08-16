import Joi, { ValidationError } from 'joi';

class Operator {
  static readonly VALID_OPERATORS: ReadonlyArray<string> = ['and', 'or'];

  constructor(public readonly operator: string) {
    if (!Operator.VALID_OPERATORS.includes(operator)) {
      throw `"${operator}" is not a valid operator`;
    }
    this.operator = operator;
  }

  toObj() {
    return { operator: this.operator };
  }

  static fromObj(obj: Record<string, string>) {
    return new Operator(obj.operator);
  }
}

class ConditionSet {
  constructor(
    public readonly conditions: ReadonlyArray<Condition | Operator>
  ) {}

  validate() {
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

  toList() {
    return this.conditions.map((cnd) => {
      return cnd.toObj();
    });
  }

  static fromList(list: ReadonlyArray<Record<string, string>>) {
    return new ConditionSet(
      list.map((ele: Record<string, string>) => {
        if ('operator' in ele) return Operator.fromObj(ele);
        return Condition.fromObj(ele);
      })
    );
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
    const list = JSON.parse(String.fromCharCode(...decoded));
    return ConditionSet.fromList(list);
  }

  static fromJSON(json: string) {
    return ConditionSet.fromList(JSON.parse(json));
  }
}

class Condition {
  defaults = {};
  state = {};

  error: ValidationError | undefined;
  value: Record<string, unknown> = {};

  toObj() {
    return this.validate().value;
  }

  static fromObj(obj: Record<string, string>) {
    return new ContractCondition(obj);
  }

  readonly schema = Joi.object({});

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
  readonly schema = Joi.object({
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
  readonly schema = Joi.object({
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
  readonly defaults = {
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
