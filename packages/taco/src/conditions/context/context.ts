import { Context, Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { fromJSON, toJSON } from '@nucypher/shared';
import { ethers } from 'ethers';

import { CompoundConditionType } from '../compound-condition';
import { Condition, ConditionProps } from '../condition';
import { ConditionExpression } from '../condition-expr';
import {
  CONTEXT_PARAM_PREFIX,
  CONTEXT_PARAM_REGEXP,
  RESERVED_CONTEXT_PARAMS,
  USER_ADDRESS_PARAM,
} from '../const';

import { TypedSignature, WalletAuthenticationProvider } from './providers';

export type CustomContextParam = string | number | boolean;
export type ContextParam = CustomContextParam | TypedSignature;

const ERR_RESERVED_PARAM = (key: string) =>
  `Cannot use reserved parameter name ${key} as custom parameter`;
const ERR_INVALID_CUSTOM_PARAM = (key: string) =>
  `Custom parameter ${key} must start with ${CONTEXT_PARAM_PREFIX}`;
const ERR_SIGNER_REQUIRED = `Signer required to satisfy ${USER_ADDRESS_PARAM} context variable in condition`;
const ERR_MISSING_CONTEXT_PARAMS = (params: string[]) =>
  `Missing custom context parameter(s): ${params.join(', ')}`;
const ERR_UNKNOWN_CONTEXT_PARAMS = (params: string[]) =>
  `Unknown custom context parameter(s): ${params.join(', ')}`;

export class ConditionContext {
  private readonly walletAuthProvider?: WalletAuthenticationProvider;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly condition: Condition,
    public readonly customParameters: Record<string, CustomContextParam> = {},
    private readonly signer?: ethers.Signer,
  ) {
    if (this.signer) {
      this.walletAuthProvider = new WalletAuthenticationProvider(
        this.provider,
        this.signer,
      );
    }
    this.validate();
  }

  private validate(): void {
    Object.keys(this.customParameters).forEach((key) => {
      if (RESERVED_CONTEXT_PARAMS.includes(key)) {
        throw new Error(ERR_RESERVED_PARAM(key));
      }
      if (!key.startsWith(CONTEXT_PARAM_PREFIX)) {
        throw new Error(ERR_INVALID_CUSTOM_PARAM(key));
      }
    });

    if (this.condition.requiresSigner() && !this.signer) {
      throw new Error(ERR_SIGNER_REQUIRED);
    }
  }

  public toObj = async (): Promise<Record<string, ContextParam>> => {
    const condObject = this.condition.toObj();
    const parsedCondObject = fromJSON(
      new WASMConditions(toJSON(condObject)).toString(),
    );
    const requestedParameters = this.findRequestedParameters(parsedCondObject);
    const parameters = await this.fillContextParameters(requestedParameters);

    // Ok, so at this point we should have all the parameters we need
    // If we don't, we have a problem and we should throw
    const missingParameters = Array.from(requestedParameters).filter(
      (key) => parameters[key] === undefined,
    );
    if (missingParameters.length > 0) {
      throw new Error(ERR_MISSING_CONTEXT_PARAMS(missingParameters));
    }

    // We may also have some parameters that are not used
    const unknownParameters = Object.keys(parameters).filter(
      (key) =>
        !requestedParameters.has(key) && !RESERVED_CONTEXT_PARAMS.includes(key),
    );
    if (unknownParameters.length > 0) {
      throw new Error(ERR_UNKNOWN_CONTEXT_PARAMS(unknownParameters));
    }

    return parameters;
  };

  private async fillContextParameters(
    requestedParameters: Set<string>,
  ): Promise<Record<string, ContextParam>> {
    // Now, we can safely add all the parameters
    const parameters: Record<string, ContextParam> = {};

    // Fill in predefined context parameters
    if (requestedParameters.has(USER_ADDRESS_PARAM)) {
      if (!this.walletAuthProvider) {
        throw new Error(ERR_SIGNER_REQUIRED);
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
    return parameters;
  }

  private isContextParameter(param: unknown): boolean {
    return !!String(param).match(CONTEXT_PARAM_REGEXP);
  }

  private findRequestedParameters(condition: ConditionProps) {
    // First, we want to find all the parameters we need to add
    const requestedParameters = new Set<string>();

    // Search conditions for parameters
    // Check return value test
    if (condition.returnValueTest) {
      const rvt = condition.returnValueTest.value;
      if (this.isContextParameter(rvt)) {
        requestedParameters.add(rvt);
      }
    }

    // Check condition parameters
    for (const param of condition.parameters ?? []) {
      if (this.isContextParameter(param)) {
        requestedParameters.add(param);
      }
    }

    // If it's a compound condition, check operands
    if (condition.conditionType === CompoundConditionType) {
      for (const key in condition.operands) {
        const innerParams = this.findRequestedParameters(
          condition.operands[key],
        );
        for (const param of innerParams) {
          requestedParameters.add(param);
        }
      }
    }

    return requestedParameters;
  }

  public async toJson(): Promise<string> {
    const parameters = await this.toObj();
    return toJSON(parameters);
  }

  public withCustomParams(
    params: Record<string, CustomContextParam>,
  ): ConditionContext {
    return new ConditionContext(
      this.provider,
      this.condition,
      params,
      this.signer,
    );
  }

  public async toWASMContext(): Promise<Context> {
    const asJson = await this.toJson();
    return new Context(asJson);
  }

  public static fromConditions(
    provider: ethers.providers.Provider,
    conditions: WASMConditions,
    signer?: ethers.Signer,
    customParameters?: Record<string, CustomContextParam>,
  ): ConditionContext {
    return new ConditionContext(
      provider,
      ConditionExpression.fromWASMConditions(conditions).condition,
      customParameters,
      signer,
    );
  }
}
