import { Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { fromJSON, toJSON } from '../../utils';
import { Condition } from '../base';
import { USER_ADDRESS_PARAM } from '../const';

import { TypedSignature, WalletAuthenticationProvider } from './providers';

export type CustomContextParam = string | number | boolean;
export type ContextParam = CustomContextParam | TypedSignature;

export const RESERVED_CONTEXT_PARAMS = [USER_ADDRESS_PARAM];
export const CONTEXT_PARAM_PREFIX = ':';

export class ConditionContext {
  private readonly walletAuthProvider?: WalletAuthenticationProvider;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly conditions: ReadonlyArray<Condition>,
    public readonly customParameters: Record<string, CustomContextParam> = {},
    private readonly signer?: ethers.Signer
  ) {
    this.validateContextParams(customParameters, signer);

    if (signer) {
      this.walletAuthProvider = new WalletAuthenticationProvider(
        provider,
        signer
      );
    }
  }

  private validateContextParams(
    customParameters: Record<string, CustomContextParam> = {},
    signer?: ethers.Signer
  ) {
    Object.keys(customParameters).forEach((key) => {
      if (RESERVED_CONTEXT_PARAMS.includes(key)) {
        throw new Error(
          `Cannot use reserved parameter name ${key} as custom parameter`
        );
      }
      if (!key.startsWith(CONTEXT_PARAM_PREFIX)) {
        throw new Error(
          `Custom parameter ${key} must start with ${CONTEXT_PARAM_PREFIX}`
        );
      }

      if (key === USER_ADDRESS_PARAM && !signer) {
        throw new Error(
          `Cannot use ${USER_ADDRESS_PARAM} as custom parameter without a signer`
        );
      }
    });
  }

  public toObj = async (): Promise<Record<string, ContextParam>> => {
    // First, we want to find all the parameters we need to add
    const requestedParameters = new Set<string>();

    // Search conditions for parameters
    const conditions = this.conditions.map((cnd) => cnd.toObj());
    const conditionsToCheck = fromJSON(
      new WASMConditions(toJSON(conditions)).toString()
    );
    for (const cond of conditionsToCheck) {
      // Check return value test
      const rvt = cond.returnValueTest.value;
      if (typeof rvt === 'string' && rvt.startsWith(CONTEXT_PARAM_PREFIX)) {
        requestedParameters.add(rvt);
      }

      // Check condition parameters
      for (const param of cond.parameters ?? []) {
        if (
          typeof param === 'string' &&
          param.startsWith(CONTEXT_PARAM_PREFIX)
        ) {
          requestedParameters.add(param);
        }
      }
    }

    // Now, we can safely add all the parameters
    const parameters: Record<string, ContextParam> = {};

    // Fill in predefined context parameters
    if (requestedParameters.has(USER_ADDRESS_PARAM)) {
      if (!this.walletAuthProvider) {
        throw new Error(
          `Cannot use ${USER_ADDRESS_PARAM} as custom parameter without a signer`
        );
      }
      parameters[USER_ADDRESS_PARAM] =
        await this.walletAuthProvider.getOrCreateWalletSignature();
      // Remove from requested parameters
      requestedParameters.delete(USER_ADDRESS_PARAM);
    }

    // Fill in custom parameters
    for (const key in this.customParameters) {
      parameters[key] = this.customParameters[key];
    }

    // Ok, so at this point we should have all the parameters we need
    // If we don't, we have a problem and we should throw
    const missingParameters = Array.from(requestedParameters).filter(
      (key) => !parameters[key]
    );
    if (missingParameters.length > 0) {
      throw new Error(
        `Missing custom context parameter(s): ${missingParameters.join(', ')}`
      );
    }

    return parameters;
  };

  public toJson = async (): Promise<string> => {
    const parameters = await this.toObj();
    return toJSON(parameters);
  };

  public withCustomParams = (
    params: Record<string, CustomContextParam>
  ): ConditionContext => {
    return new ConditionContext(
      this.provider,
      this.conditions,
      params,
      this.signer
    );
  };
}
