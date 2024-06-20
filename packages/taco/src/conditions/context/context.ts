import { ThresholdMessageKit } from '@nucypher/nucypher-core';
import { toJSON } from '@nucypher/shared';
import { AUTH_METHOD_FOR_PARAM, AuthProviders, AuthSignature } from '@nucypher/taco-auth';

import { CoreConditions, CoreContext } from '../../types';
import { CompoundConditionType } from '../compound-condition';
import { Condition, ConditionProps } from '../condition';
import { ConditionExpression } from '../condition-expr';
import { CONTEXT_PARAM_PREFIX, CONTEXT_PARAM_REGEXP, RESERVED_CONTEXT_PARAMS } from '../const';


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
  public requestedParameters: Set<string>;

  constructor(
    condition: Condition,
    public readonly customParameters: Record<string, CustomContextParam> = {},
    private readonly authProviders: AuthProviders = {},
  ) {
    const condProps = condition.toObj();
    this.validateParameters();
    this.validateCoreConditions(condProps);
    this.requestedParameters = ConditionContext.findRequestedParameters(condProps);
    this.validateAuthProviders(this.requestedParameters);
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
  }

  private validateCoreConditions(condObject: ConditionProps) {
    // Checking whether the condition is compatible with the current version of the library
    // Intentionally ignoring the return value of the function
    new CoreConditions(toJSON(condObject));
  }

  private validateNoMissingParameters(parameters: Record<string, ContextParam>) {
    // Ok, so at this point we should have all the parameters we need
    // If we don't, we have a problem and we should throw
    const missingParameters = Array.from(this.requestedParameters).filter(
      (key) => parameters[key] === undefined,
    );
    if (missingParameters.length > 0) {
      throw new Error(ERR_MISSING_CONTEXT_PARAMS(missingParameters));
    }

    // We may also have some parameters that are not used
    const unknownParameters = Object.keys(parameters).filter(
      (key) =>
        !this.requestedParameters.has(key) && !RESERVED_CONTEXT_PARAMS.includes(key),
    );
    if (unknownParameters.length > 0) {
      throw new Error(ERR_UNKNOWN_CONTEXT_PARAMS(unknownParameters));
    }
  }

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
        // TODO: Hide getOrCreateAuthSignature behind a more generic interface
        return [param, await maybeAuthProvider!.getOrCreateAuthSignature()];
      }));
    return Object.fromEntries(entries);
  }

  private static isContextParameter(param: unknown): boolean {
    return !!String(param).match(CONTEXT_PARAM_REGEXP);
  }

  public static findRequestedParameters(condition: ConditionProps) {
    // First, we want to find all the parameters we need to add
    const requestedParameters = new Set<string>();

    // Search conditions for parameters
    // Check return value test
    if (condition.returnValueTest) {
      const rvt = condition.returnValueTest.value;
      if (ConditionContext.isContextParameter(rvt)) {
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
    const parameters = await this.toContextParameters();
    return toJSON(parameters);
  }

  public async toCoreContext(): Promise<CoreContext> {
    const asJson = await this.toJson();
    return new CoreContext(asJson);
  }

  public toContextParameters = async (): Promise<Record<string, ContextParam>> => {
    const parameters = await this.fillContextParameters(this.requestedParameters);
    this.validateNoMissingParameters(parameters);
    return parameters;
  };

  public static fromConditions(
    conditions: CoreConditions,
    authProviders?: AuthProviders,
    customParameters?: Record<string, CustomContextParam>,
  ): ConditionContext {
    return new ConditionContext(
      ConditionExpression.fromCoreConditions(conditions).condition,
      customParameters,
      authProviders,
    );
  }

  public static requestedParameters(messageKit: ThresholdMessageKit): Set<string> {
    const conditionExpr = ConditionExpression.fromCoreConditions(messageKit.acp.conditions);
    return ConditionContext.findRequestedParameters(conditionExpr.condition.toObj());
  }
}
