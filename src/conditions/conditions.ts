import Joi, { ValidationError } from 'joi';

import { ChainId } from '../types';

export const SUPPORTED_CHAINS = [
  ChainId.MAINNET,
  ChainId.GOERLI,
  ChainId.POLYGON,
  ChainId.MUMBAI,
];
export class Condition {
  public static readonly COMPARATORS = ['==', '>', '<', '>=', '<=', '!='];

  public readonly schema = Joi.object();
  public readonly defaults = {};
  private validationError?: ValidationError;

  constructor(private readonly value: Record<string, unknown> = {}) {}

  public get error(): string | undefined {
    return this.validationError?.message;
  }

  protected makeReturnValueTest() {
    return Joi.object({
      index: Joi.number().optional(),
      comparator: Joi.string()
        .valid(...Condition.COMPARATORS)
        .required(),
      value: Joi.alternatives(Joi.string(), Joi.number()).required(),
    });
  }

  public toObj(): Record<string, unknown> {
    const { error, value } = this.validate();
    if (error) {
      throw Error(error.message);
    }
    return value;
  }

  public static fromObj(obj: Record<string, unknown>) {
    return new Condition(obj);
  }

  public validate(data: Record<string, unknown> = {}) {
    const newValue = Object.assign(this.defaults, this.value, data);
    return this.schema.validate(newValue);
  }

  public getContextParameters(): string[] {
    // Check all the places where context parameters may be hiding
    const asObject = this.toObj();
    let paramsToCheck: string[] = [];

    // They may be hiding in the method parameters
    const method = asObject['method'] as string;
    if (method) {
      const contextParams = RpcCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
      paramsToCheck = [...(contextParams ?? [])];
    }

    // Or in the ReturnValue test
    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;
    if (returnValueTest) {
      paramsToCheck.push(returnValueTest['value']);
    }

    // Merge & deduplicate found context parameters
    paramsToCheck = [
      ...paramsToCheck,
      ...((asObject['parameters'] as string[]) ?? []),
    ];
    const withoutDuplicates = new Set(
      paramsToCheck.filter((p) => paramsToCheck.includes(p))
    );
    return [...withoutDuplicates];
  }
}

// A helper method for making complex Joi types
// It says "allow these `types` when `parent` value is given"
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

export const USER_ADDRESS_PARAM = ':userAddress';
export const SPECIAL_CONTEXT_PARAMS = [USER_ADDRESS_PARAM];

class TimelockCondition extends Condition {
  public static readonly CONDITION_TYPE = 'timelock';

  defaults = {
    method: 'timelock',
  };

  public readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
    method: 'timelock',
  });
}

class RpcCondition extends Condition {
  public static readonly CONDITION_TYPE = 'rpc';
  public static readonly RPC_METHODS = ['eth_getBalance', 'balanceOf'];
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    eth_getBalance: ['address'],
    balanceOf: ['address'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    eth_getBalance: [USER_ADDRESS_PARAM],
    balanceOf: [USER_ADDRESS_PARAM],
  };

  public readonly schema = Joi.object({
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcCondition.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });

  public getContextParameters = (): string[] => {
    const asObject = this.toObj();

    const method = asObject['method'] as string;
    const parameters = (asObject['parameters'] ?? []) as string[];

    const context = RpcCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;

    const maybeParams = [...(context ?? []), returnValueTest['value']];
    return parameters.filter((p) => maybeParams.includes(p));
  };
}

class EvmCondition extends Condition {
  public static readonly CONDITION_TYPE = 'evm';
  public static readonly STANDARD_CONTRACT_TYPES = [
    'ERC20',
    'ERC721',
    // 'ERC1155', // TODO(#131)
  ];
  public static readonly METHODS_PER_CONTRACT_TYPE: Record<string, string[]> = {
    ERC20: ['balanceOf'],
    ERC721: ['balanceOf', 'ownerOf'],
    // ERC1155: ['balanceOf'], // TODO(#131)
  };
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    balanceOf: ['address'],
    ownerOf: ['tokenId'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    balanceOf: [USER_ADDRESS_PARAM],
    ownerOf: [USER_ADDRESS_PARAM],
  };

  private makeMethod = () =>
    makeGuard(
      Joi.string(),
      EvmCondition.METHODS_PER_CONTRACT_TYPE,
      'standardContractType'
    );

  public readonly schema = Joi.object({
    contractAddress: Joi.string()
      .pattern(new RegExp('^0x[a-fA-F0-9]{40}$'))
      .required(),
    chain: Joi.string()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...EvmCondition.STANDARD_CONTRACT_TYPES)
      .optional(),
    functionAbi: Joi.object().optional(),
    method: this.makeMethod().required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}

class ERC721Ownership extends EvmCondition {
  readonly defaults = {
    method: 'ownerOf',
    parameters: [],
    standardContractType: 'ERC721',
    returnValueTest: {
      index: 0,
      comparator: '==',
      value: USER_ADDRESS_PARAM,
    },
  };
}

class ERC721Balance extends EvmCondition {
  readonly defaults = {
    method: 'balanceOf',
    parameters: [USER_ADDRESS_PARAM],
    standardContractType: 'ERC721',
    returnValueTest: {
      index: 0,
      comparator: '>',
      value: '0',
    },
  };
}

export const Conditions = {
  ERC721Ownership,
  ERC721Balance,
  EvmCondition,
  TimelockCondition,
  RpcCondition,
  Condition,
};
