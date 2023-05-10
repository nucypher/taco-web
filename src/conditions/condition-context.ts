import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';
import { utils as ethersUtils } from 'ethers/lib/ethers';

import { Eip712TypedData, FormattedTypedData } from '../web3';

import { SPECIAL_CONTEXT_PARAMS, USER_ADDRESS_PARAM } from './conditions';

interface TypedSignature {
  signature: string;
  typedData: Eip712TypedData;
  address: string;
}

export type CustomContextParam = string | number | boolean;

export class ConditionContext {
  private walletSignature?: Record<string, string>;

  constructor(
    private readonly conditions: WASMConditions,
    private readonly web3Provider: ethers.providers.Web3Provider,
    public readonly customParameters: Record<string, CustomContextParam> = {}
  ) {
    Object.keys(customParameters).forEach((key) => {
      if (SPECIAL_CONTEXT_PARAMS.includes(key)) {
        throw new Error(
          `Cannot use reserved parameter name ${key} as custom parameter`
        );
      }
    });
  }

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const address = await this.web3Provider.getSigner().getAddress();
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
    const address = await this.web3Provider.getSigner().getAddress();
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
    const signature = await this.web3Provider
      .getSigner()
      ._signTypedData(typedData.domain, typedData.types, typedData.message);

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
    const blockNumber = await this.web3Provider.getBlockNumber();
    const blockHash = (await this.web3Provider.getBlock(blockNumber)).hash;
    const chainId = (await this.web3Provider.getNetwork()).chainId;
    return { blockNumber, blockHash, chainId };
  }

  public toJson = async (): Promise<string> => {
    const payload: Record<string, CustomContextParam | TypedSignature> = {};
    if (this.conditions.toString().includes(USER_ADDRESS_PARAM)) {
      payload[USER_ADDRESS_PARAM] = await this.getOrCreateWalletSignature();
    }

    const conditions = JSON.parse(this.conditions.toString());
    conditions.forEach((cond: { parameters: string[] }) => {
      cond.parameters.forEach((key) => {
        if (
          !(key in this.customParameters) &&
          !SPECIAL_CONTEXT_PARAMS.includes(key)
        ) {
          throw new Error(`Missing custom context parameter ${key}`);
        }
      });
    });

    Object.keys(this.customParameters).forEach((key) => {
      payload[key] = this.customParameters[key];
    });
    return JSON.stringify(payload);
  };

  public withCustomParams = (
    params: Record<string, CustomContextParam>
  ): ConditionContext => {
    return new ConditionContext(this.conditions, this.web3Provider, params);
  };
}
