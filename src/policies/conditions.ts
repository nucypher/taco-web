import { utils as ethersUtils } from 'ethers';
import { sha256 } from 'ethers/lib/utils';
import Joi, { ValidationError } from 'joi';

import { toBytes } from '../utils';
import { Web3Provider } from '../web3';

export class Operator {
  static readonly LOGICAL_OPERATORS: ReadonlyArray<string> = ['and', 'or'];

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

  public toJson() {
    return JSON.stringify(this.toList());
  }

  public toBase64() {
    return this.toBuffer().toString('base64');
  }

  public toBuffer() {
    return Buffer.from(this.toJson());
  }

  public static fromBytes(bytes: Uint8Array) {
    const decoded = Buffer.from(Buffer.from(bytes).toString('ascii'), 'base64');
    const list = JSON.parse(String.fromCharCode(...decoded));
    return ConditionSet.fromList(list);
  }

  public static fromJSON(json: string) {
    return ConditionSet.fromList(JSON.parse(json));
  }

  public buildContext(provider: Web3Provider): ConditionContext {
    return new ConditionContext(this, provider);
  }
}

export class Condition {
  // TODO: Shared types, move them somewhere?
  public static readonly COMPARATOR_OPERATORS = ['==', '>', '<', '>=', '<=']; // TODO: Is "!=" supported?
  public static readonly SUPPORTED_CHAINS = [
    'ethereum',
    // 'polygon', 'mumbai'
  ];

  readonly schema = Joi.object({});
  public readonly defaults = {};
  public state = {};

  public error: ValidationError | undefined;
  public value: Record<string, unknown> = {};

  constructor(data: Record<string, unknown> = {}) {
    this.validate(data);
  }

  protected makeReturnValueTest = () =>
    Joi.object({
      comparator: Joi.string()
        .valid(...Condition.COMPARATOR_OPERATORS)
        .required(),
      value: Joi.string().required(),
    });

  public toObj(): Record<string, unknown> {
    return this.validate().value;
  }

  public static fromObj(obj: Record<string, string>) {
    return new ContractCondition(obj);
  }

  public validate(data: Record<string, unknown> = {}) {
    this.state = Object.assign(this.defaults, this.state, data);
    const { error, value } = this.schema.validate(this.state);
    this.error = error;
    this.value = value;
    return { error, value };
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

  public readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
  });
}

class RpcCondition extends Condition implements ContextProvider {
  public static readonly CONDITION_TYPE = 'rpc';
  public static readonly RPC_METHODS = ['eth_getBalance', 'balanceOf'];

  public readonly schema = Joi.object({
    chain: Joi.string()
      .valid(...Condition.SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcCondition.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });

  public getContext = (): string[] => {
    const asObject = this.toObj();
    // TODO: Check whether parameters are actually addresses?
    const maybeParameters = (asObject['parameters'] ?? []) as string[];
    return maybeParameters;
  };
}

class ContractCondition extends Condition implements ContextProvider {
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
  private readonly CONTEXT_PROVIDER_PER_METHOD: Record<string, string[]> = {
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

  public getContext = (): string[] => {
    const asObject = this.toObj();
    // TODO: Check whether parameters are actually addresses?
    const maybeParameters = (asObject['parameters'] ?? []) as string[];
    return maybeParameters;
  };
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

export interface ContextProvider {
  getContext: () => string[];
}

export class ConditionContext {
  private conditionsSignature?: string;
  private walletSignature?: string;
  private addressForSignature?: string;

  constructor(
    private readonly conditionSet: ConditionSet,
    public readonly provider: Web3Provider
  ) {}

  private get parameters() {
    const parameters = this.conditionSet.conditions
      .map((conditionOrOperator) => {
        if (
          conditionOrOperator instanceof Condition &&
          'makeContext' in conditionOrOperator
        ) {
          const condition = conditionOrOperator as ContextProvider;
          return condition.getContext();
        }
        return null;
      })
      .filter(
        (maybeResult: unknown | undefined) => !!maybeResult
      ) as string[][];
    return parameters.flat();
  }

  private isNewWallet(): boolean {
    return this.provider.signer._address !== this.addressForSignature;
  }

  private updateAddress() {
    this.addressForSignature = this.provider.signer._address;
  }

  public async getOrCreateConditionsSignature(): Promise<string> {
    // TODO: Should we also take into the account the freshness of on-chain data?
    // Example: If I check for NFT ownership and the NFT is transferred, the signature should be invalidated.
    // How long should we keep the signature valid? Well, as long as the network deems it valid. But how long is that?
    if (!this.conditionsSignature || this.isNewWallet()) {
      this.conditionsSignature = await this.createConditionsSignature();
      this.updateAddress();
    }
    return this.conditionsSignature;
  }

  private async createConditionsSignature(): Promise<string> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash } = await this.getBlockData();

    const conditions = this.conditionSet.toJson();

    // TODO: Refactor `typeData` into a helper method
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
        ],
        Condition: [
          { name: 'address', type: 'address' },
          { name: 'conditions', type: 'string' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'tDec',
        version: '1',
        chainId: 1,
        salt: ethersUtils.randomBytes(32),
      },
      message: {
        address: this.provider.signer._address,
        conditions,
        blockNumber,
        blockHash,
      },
    };

    return this.provider.signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
  }

  public async getOrCreateWalletSignature(): Promise<string> {
    if (!this.walletSignature || this.isNewWallet()) {
      this.walletSignature = await this.createWalletSignature();
      this.updateAddress();
    }
    return this.walletSignature;
  }

  private async createWalletSignature(): Promise<string> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash } = await this.getBlockData();

    const address = this.provider.signer._address;
    const signatureText = `I'm an owner of address ${address} as of block number ${blockNumber}`; // TODO: Update this text to a more dramatic one

    const salt = ethersUtils.randomBytes(32);

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'salt', type: 'bytes32' },
        ],
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
        chainId: 1,
        salt,
      },
      message: {
        address,
        signatureText,
        blockNumber,
        blockHash,
      },
    };

    return this.provider.signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
  }

  private async getBlockData() {
    const blockNumber = await this.provider.provider.getBlockNumber();
    const block = await this.provider.provider.getBlock(blockNumber);
    const blockHash = block.hash;
    return { blockNumber, blockHash };
  }

  public toRecord = async (): Promise<Record<string, unknown>> => {
    return {
      parameters: this.parameters,
      // TODO: Which signature to use? `walletSignature` or `conditionsSignature`?
      signature: await this.getOrCreateWalletSignature(),
    };
  };

  public toBytes = (): Uint8Array => {
    // TODO: Make sure this implementation matches nucypher-core
    return this.parameters
      .map(toBytes)
      .reduce(
        (prev, next) => new Uint8Array([...prev, ...next]),
        new Uint8Array()
      );
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
