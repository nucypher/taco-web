import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Eip712TypedData } from '../web3';

import { USER_ADDRESS_PARAM } from './const';
import { WalletAuthenticationProvider } from './providers';

interface TypedSignature {
  signature: string;
  typedData: Eip712TypedData;
  address: string;
}

export type CustomContextParam = string | number | boolean;

const SPECIAL_CONTEXT_PARAMS = [USER_ADDRESS_PARAM];

export class ConditionContext {
  private readonly walletAuthProvider: WalletAuthenticationProvider;

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
    this.walletAuthProvider = new WalletAuthenticationProvider(web3Provider);
  }

  public toJson = async (): Promise<string> => {
    const payload: Record<string, CustomContextParam | TypedSignature> = {};
    if (this.conditions.toString().includes(USER_ADDRESS_PARAM)) {
      payload[USER_ADDRESS_PARAM] =
        await this.walletAuthProvider.getOrCreateWalletSignature();
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
