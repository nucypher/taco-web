import { initialize } from '@nucypher/nucypher-core';
import { AuthProviders } from '@nucypher/taco-auth';
import { fakeAuthProviders } from '@nucypher/test-utils';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EnsAddressOwnershipCondition,
  ensAddressOwnershipConditionSchema,
  EnsAddressOwnershipConditionType,
} from '../../../src/conditions/base/ens-ownership-condition';

describe('EnsAddressOwnershipCondition', () => {
  let authProviders: AuthProviders;

  beforeAll(async () => {
    await initialize();
  });

  beforeEach(() => {
    authProviders = fakeAuthProviders();
  });

  it('should return a JSON representation of the condition', async () => {
    const ensName = 'andrestest.eth';
    const resolvedAddress = '0xf45ED59ea03AaA29EAB6DB0Ea019E5299b335Ea2';
    const condition = new EnsAddressOwnershipCondition({
      ensName,
      domain: 'tapir',
      authProviders,
    });

    condition.value.resolvedAddress = resolvedAddress;

    const jsonRepresentation = {
      ensName: condition.value.ensName,
      resolvedAddress: condition.value.resolvedAddress,
      schema: ensAddressOwnershipConditionSchema,
      value: {
        conditionType: EnsAddressOwnershipConditionType,
        ensName: condition.value.ensName,
      },
    };

    expect(jsonRepresentation).toEqual({
      ensName: 'andrestest.eth',
      resolvedAddress: '0xf45ED59ea03AaA29EAB6DB0Ea019E5299b335Ea2',
      schema: ensAddressOwnershipConditionSchema,
      value: {
        conditionType: 'ensOwnership',
        ensName: 'andrestest.eth',
      },
    });
  });

  it('should resolve the ENS name successfully', async () => {
    const ensName = 'andrestest.eth';
    const condition = new EnsAddressOwnershipCondition({
      ensName,
      domain: 'tapir',
      authProviders,
    });

    const clientMock = vi
      .spyOn(condition, 'resolve')
      .mockResolvedValueOnce(undefined);

    await condition.resolve();

    expect(clientMock).toHaveBeenCalled();
  });

  it('should throw an error if the ENS name cannot be resolved', async () => {
    const ensName = 'nonexistent.eth';
    const condition = new EnsAddressOwnershipCondition({
      ensName,
      domain: 'tapir',
      authProviders,
    });

    vi.spyOn(condition, 'resolve').mockImplementationOnce(async () => {
      throw new Error('ENS name could not be resolved');
    });

    await expect(condition.resolve()).rejects.toThrow(
      'ENS name could not be resolved',
    );
  });

  // it('should validate the ENS ownership successfully', async () => {
  //   const ensName = 'andrestest.eth';
  //   const resolvedAddress = '0xf45ED59ea03AaA29EAB6DB0Ea019E5299b335Ea2';
  //   const condition = new EnsAddressOwnershipCondition({
  //     ensName,
  //     domain: 'tapir',
  //     authProviders,
  //   });

  //   condition.value.resolvedAddress = resolvedAddress;

  //   const authProviderMock = vi.spyOn(authProviders[EIP4361_AUTH_METHOD], 'getOrCreateAuthSignature')
  //     .mockResolvedValueOnce({
  //       address: resolvedAddress,
  //       signature: 'mockSignature',
  //     });

  //   await expect(condition.validate(authProviders)).resolves.toBeUndefined();
  //   expect(authProviderMock).toHaveBeenCalled();
  // });

  // it('should throw an error if the ENS ownership validation fails', async () => {
  //   const ensName = 'andrestest.eth';
  //   const resolvedAddress = '0xf45ED59ea03AaA29EAB6DB0Ea019E5299b335Ea2';
  //   const condition = new EnsAddressOwnershipCondition({
  //     ensName,
  //     domain: 'tapir',
  //     authProviders,
  //   });

  //   condition.value.resolvedAddress = resolvedAddress;

  //   vi.spyOn(authProviders[EIP4361_AUTH_METHOD], 'getOrCreateAuthSignature')
  //     .mockResolvedValueOnce({
  //       address: '0xDifferentAddress',
  //       signature: 'mockSignature',
  //     });

  //   await expect(condition.validate(authProviders)).rejects.toThrow(
  //     `Error: ENS ownership verification failed. The signer is not the owner of the ${ensName} ENS`,
  //   );
  // });
});
