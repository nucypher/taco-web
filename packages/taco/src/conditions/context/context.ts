import { ThresholdMessageKit } from '@nucypher/nucypher-core';
import { toJSON } from '@nucypher/shared';
import {
  AuthProvider,
  AuthSignature,
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
} from '@nucypher/taco-auth';

import { CoreConditions, CoreContext } from '../../types';
import { CompoundConditionType } from '../compound-condition';
import { Condition, ConditionProps } from '../condition';
import { ConditionExpression } from '../condition-expr';
import {
  CONTEXT_PARAM_FULL_MATCH_REGEXP,
  CONTEXT_PARAM_PREFIX,
  CONTEXT_PARAM_REGEXP,
  USER_ADDRESS_PARAMS,
} from '../const';
import { JsonApiConditionType } from '../schemas/json-api';

export type CustomContextParam = string | number | boolean;
export type ContextParam = CustomContextParam | AuthSignature;

const ERR_RESERVED_PARAM = (key: string) =>
  `Cannot use reserved parameter name ${key} as custom parameter`;
const ERR_INVALID_CUSTOM_PARAM = (key: string) =>
  `Custom parameter ${key} must start with ${CONTEXT_PARAM_PREFIX}`;
const ERR_AUTH_PROVIDER_REQUIRED = (key: string) =>
  `No matching authentication provider to satisfy ${key} context variable in condition`;
const ERR_MISSING_CONTEXT_PARAMS = (params: string[]) =>
  `Missing custom context parameter(s): ${params.join(', ')}`;
const ERR_UNKNOWN_CUSTOM_CONTEXT_PARAM = (param: string) =>
  `Unknown custom context parameter: ${param}`;
const ERR_INVALID_AUTH_PROVIDER_TYPE = (param: string, expected: string) =>
  `Invalid AuthProvider type for ${param}; expected ${expected}`;
const ERR_AUTH_PROVIDER_NOT_NEEDED_FOR_CONTEXT_PARAM = (param: string) =>
  `AuthProvider not necessary for context parameter: ${param}`;

type AuthProviderType =
  | typeof EIP4361AuthProvider
  | typeof SingleSignOnEIP4361AuthProvider;
const EXPECTED_AUTH_PROVIDER_TYPES: Record<string, AuthProviderType> = {
  [USER_ADDRESS_PARAM_DEFAULT]: EIP4361AuthProvider,
  [USER_ADDRESS_PARAM_EXTERNAL_EIP4361]: SingleSignOnEIP4361AuthProvider,
};

export const RESERVED_CONTEXT_PARAMS = [
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
  USER_ADDRESS_PARAM_DEFAULT,
];

export class ConditionContext {
  public requestedContextParameters: Set<string>;
  private customContextParameters: Record<string, CustomContextParam> = {};
  private authProviders: Record<string, AuthProvider> = {};

  constructor(condition: Condition) {
    const condProps = condition.toObj();
    ConditionContext.validateCoreConditions(condProps);
    this.requestedContextParameters =
      ConditionContext.findContextParameters(condProps);
  }

  private static validateCoreConditions(condObject: ConditionProps) {
    // Checking whether the condition is compatible with the current version of the library
    // Intentionally ignoring the return value of the function
    new CoreConditions(toJSON(condObject));
  }

  private validateNoMissingContextParameters(
    parameters: Record<string, ContextParam>,
  ) {
    // Ok, so at this point we should have all the parameters we need
    // If we don't, we have a problem and we should throw
    const missingParameters = Array.from(
      this.requestedContextParameters,
    ).filter((key) => parameters[key] === undefined);
    if (missingParameters.length > 0) {
      throw new Error(ERR_MISSING_CONTEXT_PARAMS(missingParameters));
    }
  }

  private async fillContextParameters(
    requestedContextParameters: Set<string>,
  ): Promise<Record<string, ContextParam>> {
    const parameters = await this.fillAuthContextParameters(
      requestedContextParameters,
    );
    for (const key in this.customContextParameters) {
      parameters[key] = this.customContextParameters[key];
    }
    return parameters;
  }

  private validateAuthProviders(): void {
    for (const param of this.requestedContextParameters) {
      // If it's not a user address parameter, we can skip
      if (!USER_ADDRESS_PARAMS.includes(param)) {
        continue;
      }

      // we don't have a corresponding auth provider, we have a problem
      if (!this.authProviders[param]) {
        throw new Error(ERR_AUTH_PROVIDER_REQUIRED(param));
      }
    }
  }

  private async fillAuthContextParameters(
    requestedParameters: Set<string>,
  ): Promise<Record<string, ContextParam>> {
    const entries = await Promise.all(
      [...requestedParameters]
        .filter((param) => USER_ADDRESS_PARAMS.includes(param))
        .map(async (param) => {
          const maybeAuthProvider = this.authProviders[param];
          // TODO: Throw here instead of validating in the constructor?
          // TODO: Hide getOrCreateAuthSignature behind a more generic interface
          return [param, await maybeAuthProvider!.getOrCreateAuthSignature()];
        }),
    );
    return Object.fromEntries(entries);
  }

  private validateCustomContextParameter(customParam: string): void {
    if (!ConditionContext.isContextParameter(customParam)) {
      throw new Error(ERR_INVALID_CUSTOM_PARAM(customParam));
    }

    if (RESERVED_CONTEXT_PARAMS.includes(customParam)) {
      throw new Error(ERR_RESERVED_PARAM(customParam));
    }

    if (!this.requestedContextParameters.has(customParam)) {
      throw new Error(ERR_UNKNOWN_CUSTOM_CONTEXT_PARAM(customParam));
    }
  }

  private static isContextParameter(param: unknown): boolean {
    return !!String(param).match(CONTEXT_PARAM_FULL_MATCH_REGEXP);
  }

  private static findContextParameters(condition: ConditionProps) {
    // First, we want to find all the parameters we need to add
    const requestedParameters = new Set<string>();

    // Check return value test
    if (condition.returnValueTest) {
      const rvt = condition.returnValueTest.value;
      // Return value test can be a single parameter or an array of parameters
      if (Array.isArray(rvt)) {
        rvt.forEach((value) => {
          if (ConditionContext.isContextParameter(value)) {
            requestedParameters.add(value);
          }
        });
      } else if (ConditionContext.isContextParameter(rvt)) {
        requestedParameters.add(rvt);
      } else {
        // Not a context parameter, we can skip
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
        const innerParams = this.findContextParameters(condition.operands[key]);
        for (const param of innerParams) {
          requestedParameters.add(param);
        }
      }
    }
    // If it's a JSON API condition, check url and query
    if (condition.conditionType === JsonApiConditionType) {
      const urlComponents = condition.endpoint
        .replace('https://', '')
        .split('/');
      for (const param of urlComponents ?? []) {
        if (this.isContextParameter(param)) {
          requestedParameters.add(param);
        }
      }
      if (condition.query) {
        const queryParams = condition.query.match(CONTEXT_PARAM_REGEXP);
        if (queryParams) {
          for (const param of queryParams) {
            requestedParameters.add(param);
          }
        }
      }
      // always a context variable, so simply check whether defined
      if (condition.authorizationToken) {
        requestedParameters.add(condition.authorizationToken);
      }
    }

    return requestedParameters;
  }

  public addCustomContextParameterValues(
    customContextParameters: Record<string, CustomContextParam>,
  ) {
    Object.keys(customContextParameters).forEach((key) => {
      this.validateCustomContextParameter(key);
      this.customContextParameters[key] = customContextParameters[key];
    });
  }

  public addAuthProvider(contextParam: string, authProvider: AuthProvider) {
    if (!(contextParam in EXPECTED_AUTH_PROVIDER_TYPES)) {
      throw new Error(
        ERR_AUTH_PROVIDER_NOT_NEEDED_FOR_CONTEXT_PARAM(contextParam),
      );
    }

    if (!(authProvider instanceof EXPECTED_AUTH_PROVIDER_TYPES[contextParam])) {
      throw new Error(
        ERR_INVALID_AUTH_PROVIDER_TYPE(contextParam, typeof authProvider),
      );
    }

    this.authProviders[contextParam] = authProvider;
  }

  public async toJson(): Promise<string> {
    const parameters = await this.toContextParameters();
    return toJSON(parameters);
  }

  public async toCoreContext(): Promise<CoreContext> {
    const asJson = await this.toJson();
    return new CoreContext(asJson);
  }

  public toContextParameters = async (): Promise<
    Record<string, ContextParam>
  > => {
    this.validateAuthProviders();
    const parameters = await this.fillContextParameters(
      this.requestedContextParameters,
    );
    this.validateNoMissingContextParameters(parameters);
    return parameters;
  };

  public static fromMessageKit(
    messageKit: ThresholdMessageKit,
  ): ConditionContext {
    const conditionExpr = ConditionExpression.fromCoreConditions(
      messageKit.acp.conditions,
    );
    return new ConditionContext(conditionExpr.condition);
  }
}
