import Joi, { ValidationError } from 'joi';

import { Web3Provider } from '../web3';

export class Operator {
  static readonly LOGICAL_OPERATORS: ReadonlyArray<string> = [ 'and', 'or' ];

  constructor(public readonly operator: string) {
    if (!Operator.LOGICAL_OPERATORS.includes(operator)) {
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
  public static readonly COMPARATOR_OPERATORS = ['==', '>', '<', '>=', '<=']; // TODO: Is "!=" supported?
  public static readonly SUPPORTED_CHAINS = [
    'ethereum',
    // 'polygon', 'mumbai'
  ];

  protected makeReturnValueTest = () =>
    Joi.object({
      comparator: Joi.string()
        .valid(...Condition.COMPARATOR_OPERATORS)
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
  public static readonly CONDITION_TYPE = 'timelock';
  readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
  });
}

class RpcCondition extends Condition {
  public static readonly CONDITION_TYPE = 'rpc';
  public static readonly RPC_METHODS = ['eth_getBalance', 'balanceOf'];

  readonly schema = Joi.object({
    chain: Joi.string()
      .valid(...Condition.SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcCondition.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });
}

class ContractCondition extends Condition {
  public static readonly CONDITION_TYPE = 'evm';
  public static readonly STANDARD_CONTRACT_TYPES = [
    'ERC20',
    'ERC721',
    'ERC1155',
  ];
  public static readonly METHODS_PER_CONTRACT_TYPE: Record<string, string[]> = {
    ERC20: ['balanceOf'],
    ERC721: ['balanceOf', 'ownerOf'],
    ERC1155: ['balanceOf'],
  };
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    balanceOf: ['address'],
    ownerOf: ['address'],
  };

  private makeMethod = () =>
    makeGuard(
      Joi.string(),
      ContractCondition.METHODS_PER_CONTRACT_TYPE,
      'standardContractType'
    );

  public readonly schema = Joi.object({
    contractAddress: Joi.string()
      .pattern(new RegExp('^0x[a-fA-F0-9]{40}$'))
      .required(),
    chain: Joi.string()
      .valid(...Condition.SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...ContractCondition.STANDARD_CONTRACT_TYPES)
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
    standardContractType: 'ERC721',
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
  Condition,
  Operator,
};
