import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers, utils as ethersUtils } from 'ethers';
import Joi, { ValidationError } from 'joi';

import { Eip712TypedData, FormattedTypedData, Web3Provider } from '../web3';

export class Operator {
  static readonly LOGICAL_OPERATORS: ReadonlyArray<string> = ['and', 'or'];

  public constructor(public readonly operator: string) {
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

  public static AND() {
    return new Operator('and');
  }

  public static OR() {
    return new Operator('or');
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
    const web3Provider = Web3Provider.fromEthersWeb3Provider(provider);
    return new ConditionContext(this, web3Provider);
  }
}

export class Condition {
  public static readonly COMPARATOR_OPERATORS = [
    '==',
    '>',
    '<',
    '>=',
    '<=',
    '!=',
  ];

  public static readonly SUPPORTED_CHAINS = [
    1, // ethereum/mainnet
    5, // ethereum/goerli
    137, // polygon/mainnet
    80001, // polygon/mumbai
  ];

  public readonly schema = Joi.object();
  public readonly defaults = {};
  private validationError?: ValidationError;

  constructor(private readonly value: Record<string, unknown> = {}) {}

  public get error(): string | undefined {
    return this.validationError?.message;
  }

  protected makeReturnValueTest() {
    return Joi.object({
      comparator: Joi.string()
        .valid(...Condition.COMPARATOR_OPERATORS)
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
    eth_getBalance: [':userAddress'],
    balanceOf: [':userAddress'],
  };

  public readonly schema = Joi.object({
    chain: Joi.number()
      .valid(...Condition.SUPPORTED_CHAINS)
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
    ERC1155: ['balanceOf'],
  };
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    balanceOf: ['address'],
    ownerOf: ['tokenId'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    balanceOf: [':userAddress'],
    ownerOf: [':userAddress'],
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
      .valid(...Condition.SUPPORTED_CHAINS)
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
      comparator: '==',
      value: ':userAddress',
    },
  };
}

class ERC721Balance extends EvmCondition {
  readonly defaults = {
    method: 'balanceOf',
    parameters: [':userAddress'],
    standardContractType: 'ERC721',
    returnValueTest: {
      comparator: '>',
      value: '0',
    },
  };
}

interface TypedSignature {
  signature: string;
  typedData: Eip712TypedData;
  address: string;
}

export class ConditionContext {
  private walletSignature?: Record<string, string>;

  constructor(
    private readonly conditionSet: ConditionSet,
    private readonly web3Provider: Web3Provider
  ) {}

  private get contextParameters() {
    const parameters = this.conditionSet.conditions
      .map((conditionOrOperator) => {
        if (conditionOrOperator instanceof Condition) {
          const condition = conditionOrOperator as Condition;
          return condition.getContextParameters();
        }
        return null;
      })
      .filter(
        (maybeResult: unknown | undefined) => !!maybeResult
      ) as string[][];
    return parameters.flat();
  }

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const address = await this.web3Provider.signer.getAddress();
    const storageKey = `wallet-signature-${address}`;

    // If we have a signature in localStorage, return it
    const isLocalStorage = typeof localStorage !== 'undefined';
    if (isLocalStorage) {
      const maybeSignature = localStorage.getItem(storageKey);
      if (maybeSignature) {
        return JSON.parse(maybeSignature);
      }
    }

    // If not, try returning from memory
    const maybeSignature = this.walletSignature?.[address];
    if (maybeSignature) {
      if (isLocalStorage) {
        localStorage.setItem(storageKey, maybeSignature);
      }
      return JSON.parse(maybeSignature);
    }

    // If at this point we didn't return, we need to create a new signature
    const typedSignature = await this.createWalletSignature();

    // Persist where you can
    if (isLocalStorage) {
      localStorage.setItem(storageKey, JSON.stringify(typedSignature));
    }
    if (!this.walletSignature) {
      this.walletSignature = {};
    }
    this.walletSignature[address] = JSON.stringify(typedSignature);
    return typedSignature;
  }

  private async createWalletSignature(): Promise<TypedSignature> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash, chainId } = await this.getChainData();
    const address = await this.web3Provider.signer.getAddress();
    const signatureText = `I'm the owner of address ${address} as of block number ${blockNumber}`;
    const salt = ethersUtils.hexlify(ethersUtils.randomBytes(32));

    const typedData: Eip712TypedData = {
      types: {
        Wallet: [
          { name: 'address', type: 'address' },
          { name: 'signatureText', type: 'string' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'tDec',
        version: '1',
        chainId,
        salt,
      },
      message: {
        address,
        signatureText,
        blockNumber,
        blockHash,
      },
    };
    const signature = await this.web3Provider.signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );

    const formattedTypedData: FormattedTypedData = {
      ...typedData,
      primaryType: 'Wallet',
      types: {
        ...typedData.types,
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'salt',
            type: 'bytes32',
          },
        ],
      },
    };
    return { signature, typedData: formattedTypedData, address };
  }

  private async getChainData() {
    const blockNumber = await this.web3Provider.provider.getBlockNumber();
    const blockHash = (await this.web3Provider.provider.getBlock(blockNumber))
      .hash;
    const chainId = (await this.web3Provider.provider.getNetwork()).chainId;
    return { blockNumber, blockHash, chainId };
  }

  public toJson = async (): Promise<string> => {
    const userAddressParam = this.contextParameters.find(
      (p) => p === ':userAddress'
    );
    if (!userAddressParam) {
      return JSON.stringify({});
    }
    const typedSignature = await this.getOrCreateWalletSignature();
    const payload = { ':userAddress': typedSignature };
    return JSON.stringify(payload);
  };
}

const OR = new Operator('or');
const AND = new Operator('and');

export const Conditions = {
  ERC721Ownership,
  ERC721Balance,
  EvmCondition,
  TimelockCondition,
  RpcCondition,
  Condition,
  OR,
  AND,
};
