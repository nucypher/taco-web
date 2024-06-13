import { Context, Conditions as WASMConditions } from '@nucypher/nucypher-core';
import { fromJSON, toJSON } from '@nucypher/shared';
import {
  AuthProviders,
  AuthSignature,
} from '@nucypher/taco-auth';
import {AUTH_METHOD_FOR_PARAM} from "@nucypher/taco-auth";
import { ethers } from 'ethers';

import { CompoundConditionType } from '../compound-condition';
import { Condition, ConditionProps } from '../condition';
import { ConditionExpression } from '../condition-expr';
import {
  CONTEXT_PARAM_PREFIX,
  CONTEXT_PARAM_REGEXP,
  RESERVED_CONTEXT_PARAMS,
} from '../const';

export type CustomContextParam = string | number | boolean;
export type ContextParam = CustomContextParam | AuthSignature;

const ERR_RESERVED_PARAM = (key: string) =>
  `Cannot use reserved parameter name ${key} as custom parameter`;
const ERR_INVALID_CUSTOM_PARAM = (key: string) =>
  `Custom parameter ${key} must start with ${CONTEXT_PARAM_PREFIX}`;
const ERR_AUTH_PROVIDER_REQUIRED = (key: string) =>
  `Authentication provider required to satisfy ${key} context variable in condition`;
const ERR_MISSING_CONTEXT_PARAMS = (params: string[]) =>
  `Missing custom context parameter(s): ${params.join(', ')}`;
const ERR_UNKNOWN_CONTEXT_PARAMS = (params: string[]) =>
  `Unknown custom context parameter(s): ${params.join(', ')}`;

export class ConditionContext {

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly condition: Condition,
    public readonly customParameters: Record<string, CustomContextParam> = {},
    private readonly authProviders: AuthProviders = {},
  ) {
    this.validateAuthProviders(this.findRequestedParameters(this.condition.toObj()));
    this.validateParameters();
  }

  private validateParameters(): void {
    Object.keys(this.customParameters).forEach((key) => {
      if (RESERVED_CONTEXT_PARAMS.includes(key)) {
        throw new Error(ERR_RESERVED_PARAM(key));
      }
      if (!key.startsWith(CONTEXT_PARAM_PREFIX)) {
        throw new Error(ERR_INVALID_CUSTOM_PARAM(key));
      }
    });

    const requiredParam = this.condition.findParamWithAuthentication();
    if (requiredParam && !this.authProviders) {
      throw new Error(ERR_AUTH_PROVIDER_REQUIRED(requiredParam));
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
    const parameters = await this.fillAuthContextParameters(requestedParameters);
    for (const key in this.customParameters) {
      parameters[key] = this.customParameters[key];
    }
    return parameters;
  }

  private validateAuthProviders(requestedParameters: Set<string>): void {
    requestedParameters
      .forEach(param => {
        const maybeAuthMethod = AUTH_METHOD_FOR_PARAM[param];
        if (!maybeAuthMethod) {
          return;
        }
        if (!this.authProviders[maybeAuthMethod]) {
          throw new Error(ERR_AUTH_PROVIDER_REQUIRED(param));
        }
      });
  }

  private async fillAuthContextParameters(requestedParameters: Set<string>): Promise<Record<string, ContextParam>> {
    const entries = await Promise.all([...requestedParameters]
      .map(param => [param, AUTH_METHOD_FOR_PARAM[param]])
      .filter(([, authMethod]) => !!authMethod)
      .map(async ([param, authMethod]) => {
        const maybeAuthProvider = this.authProviders[authMethod];
        // TODO: Throw here instead of validating in the constructor?
        // TODO: Hide getOrCreateWalletSignature behind a more generic interface
        return [param, await maybeAuthProvider!.getOrCreateWalletSignature()];
      }));
    return Object.fromEntries(entries);
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
      this.authProviders,
    );
  }

  public async toWASMContext(): Promise<Context> {
    const asJson = await this.toJson();
    return new Context(asJson);
  }

  public static fromConditions(
    provider: ethers.providers.Provider,
    conditions: WASMConditions,
    authProviders?: AuthProviders,
    customParameters?: Record<string, CustomContextParam>,
  ): ConditionContext {
    return new ConditionContext(
      provider,
      ConditionExpression.fromWASMConditions(conditions).condition,
      customParameters,
      authProviders,
    );
  }
}
