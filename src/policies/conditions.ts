import Joi, { ValidationError } from 'joi';

export class Operator {
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

export class ConditionSet {
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

export class Condition {
  // TODO: Shared types, move them somewhere?
  public readonly COMPARATOR_OPERATORS = ['==', '>', '<', '>=', '<=']; // TODO: Is "!=" supported?
  public readonly SUPPORTED_CHAINS = [
    'ethereum',
    // 'polygon', 'mumbai'
  ];

  protected makeReturnValueTest = () =>
    Joi.object({
      comparator: Joi.string()
        .valid(...this.COMPARATOR_OPERATORS)
        .required(),
      value: Joi.string().required(),
    });

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

// A helper method for making complex Joi types
const makeGuard = (
  schema: Joi.StringSchema | Joi.ArraySchema,
  types: Record<string, string[]>,
  parent: string
) => {
  Object.entries(types).forEach(([key, value]) => {
    schema = schema.when(parent, {
      is: key,
      then: value,
    });
  });
  return schema;
};

class TimelockCondition extends Condition {
  readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
  });
}

class RpcCondition extends Condition {
  public readonly RPC_METHODS = ['eth_getBalance', 'balanceOf'];
  public readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    // TODO: Are these supposed to be defined by using context interface?
    balanceOf: ['address'],
    eth_getBalance: ['address'],
  };

  readonly schema = Joi.object({
    chain: Joi.string()
      .valid(...this.SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...this.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });
}

class ContractCondition extends Condition {
  public readonly STANDARD_CONTRACT_TYPES = ['erc20', 'erc721', 'erc1155'];
  public readonly METHODS_PER_CONTRACT_TYPE: Record<string, string[]> = {
    erc20: ['balanceOf'],
    erc721: ['balanceOf', 'ownerOf'],
    erc1155: ['balanceOf'],
  };
  public readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    // TODO: Defined using context interface?
    balanceOf: ['address'],
    ownerOf: ['address'],
  };

  private makeMethod = () =>
    makeGuard(
      Joi.string(),
      this.METHODS_PER_CONTRACT_TYPE,
      'standardContractType'
    );
  private makeParameters = () =>
    makeGuard(Joi.array(), this.PARAMETERS_PER_METHOD, 'method');

  public readonly schema = Joi.object({
    contractAddress: Joi.string()
      .pattern(new RegExp('^0x[a-fA-F0-9]{40}$'))
      .required(),
    chain: Joi.string()
      .valid(...this.SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...this.STANDARD_CONTRACT_TYPES)
      .required(),
    functionAbi: Joi.string(), // TODO: Should it be required? When?
    method: this.makeMethod().required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });
}

class ERC721Ownership extends ContractCondition {
  readonly defaults = {
    chain: 'ethereum',
    method: 'ownerOf',
    parameters: [],
    standardContractType: 'erc721',
    returnValueTest: {
      comparator: '==',
      value: ':userAddress',
    },
  };
}

export const Conditions = {
  ERC721Ownership,
  ContractCondition,
  TimelockCondition,
  RpcCondition,
};
