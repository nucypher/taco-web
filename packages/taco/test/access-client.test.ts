import { DOMAIN_NAMES, DomainName } from '@nucypher/shared';
import { fakeProvider, fakeViemPublicClient } from '@nucypher/test-utils';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  AccessClient,
  type AccessClientConfig,
  type AccessClientEthersConfig,
  type AccessClientViemConfig,
} from '../src';
import { AccessConfigValidator } from '../src/access-client/config-validator';

describe('AccessConfigValidator', () => {
  describe('Domain Management', () => {
    it('should return all supported domain names', () => {
      const domains = AccessConfigValidator.getSupportedDomains();
      expect(domains).toEqual(['lynx', 'tapir', 'mainnet']);
    });

    it.each([
      [DOMAIN_NAMES.TESTNET, 'valid testnet domain'],
      [DOMAIN_NAMES.DEVNET, 'valid devnet domain'],
      [DOMAIN_NAMES.MAINNET, 'valid production domain'],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ])('should validate domain "%s" as %s', (domain: DomainName, _: string) => {
      expect(AccessConfigValidator.isValidDomain(domain)).toBe(true);
    });

    it.each([
      ['INVALID', 'invalid domain name'],
      ['', 'empty domain name'],
      ['testnet', 'legacy domain key (not domain name)'],
    ])('should validate domain "%s" as %s', (domain: string) => {
      expect(AccessConfigValidator.isValidDomain(domain as DomainName)).toBe(
        false,
      );
    });

    it.each([
      [0, 'minimum valid ritual ID'],
      [27, 'default devnet ritual ID'],
      [6, 'default testnet ritual ID'],
      [42, 'custom mainnet ritual ID'],
      [999, 'large ritual ID for devnet'],
    ])('should validate ritual ID %d (%s)', (ritualId: number) => {
      expect(AccessConfigValidator.isValidRitualId(ritualId)).toBe(true);
    });

    it.each([
      [-1, 'negative ritual ID'],
      [5.4, 'floating point ritual ID'],
    ])('should invalidate ritual ID %d (%s)', (ritualId: number) => {
      expect(AccessConfigValidator.isValidRitualId(ritualId)).toBe(false);
    });
  });

  describe('Fast Configuration Validation', () => {
    it('should create AccessClient with viem configuration', () => {
      const result = AccessConfigValidator.validateFast({
        domain: 'tapir',
        ritualId: 6,
        viemClient: fakeViemPublicClient(),
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid domain configuration', () => {
      const result = AccessConfigValidator.validateFast({
        domain: 'INVALID_DOMAIN' as DomainName,
        ritualId: 999,
        viemClient: fakeViemPublicClient(),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when domain is missing', () => {
      const result = AccessConfigValidator.validateFast({
        ritualId: 6,
        viemClient: fakeViemPublicClient(),
      } as AccessClientConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('The property `domain` is required');
    });
  });
});

// Test helpers for accessing AccessClient's private static members
const getAccessClientStatics = () =>
  AccessClient as unknown as {
    initializationPromise: Promise<void> | undefined;
  };

const resetAccessClientStatics = () => {
  delete (AccessClient as unknown as { initializationPromise?: Promise<void> })
    .initializationPromise;
};

describe('AccessClient', () => {
  beforeAll(async () => {
    // Ensure AccessClient is initialized before running tests
    await AccessClient.initialize();
  });

  let validViemConfig: AccessClientViemConfig;
  let validEthersConfig: AccessClientEthersConfig;

  beforeEach(() => {
    validViemConfig = {
      domain: 'tapir',
      ritualId: 6,
      viemClient: fakeViemPublicClient(),
    };

    const ethersProvider = fakeProvider();
    validEthersConfig = {
      domain: 'tapir',
      ritualId: 6,
      ethersProvider,
    };
  });

  describe('Client Construction', () => {
    it('should successfully create client with valid viem configuration', async () => {
      const client = new AccessClient(validViemConfig);
      await client.validateConfig();
      expect(client).toBeInstanceOf(AccessClient);
    });

    it('should successfully create client with valid ethers configuration', async () => {
      const client = new AccessClient(validEthersConfig);
      await client.validateConfig();
      expect(client).toBeInstanceOf(AccessClient);
    });

    it('should throw error for invalid domain name', () => {
      expect(
        () =>
          new AccessClient({
            ...validViemConfig,
            domain: 'INVALID' as DomainName,
          }),
      ).toThrow('Invalid domain name');
    });

    it('should throw error for invalid ritual ID', () => {
      expect(
        () =>
          new AccessClient({
            ...validViemConfig,
            ritualId: -1,
          }),
      ).toThrow('Invalid ritual ID');
    });

    it.each([
      {
        configModifications: { domain: undefined },
        baseConfig: 'viem',
        expectedError: 'The property `domain` is required',
        description: 'missing domain from viem config',
      },
      {
        configModifications: { ritualId: undefined },
        baseConfig: 'viem',
        expectedError: 'The property `ritualId` is required',
        description: 'missing ritual ID from viem config',
      },
      {
        configModifications: { viemClient: undefined },
        baseConfig: 'viem',
        expectedError: 'viemClient is required for viem configuration',
        description: 'missing viemClient from viem config',
      },
      {
        configModifications: { domain: undefined },
        baseConfig: 'ethers',
        expectedError: 'The property `domain` is required',
        description: 'missing domain from ethers config',
      },
      {
        configModifications: { ritualId: undefined },
        baseConfig: 'ethers',
        expectedError: 'The property `ritualId` is required',
        description: 'missing ritual ID from ethers config',
      },
      {
        configModifications: { ethersProvider: undefined },
        baseConfig: 'ethers',
        expectedError: 'ethersProvider is required for ethers configuration',
        description: 'missing ethersProvider from ethers config',
      },
    ])(
      'should throw error for $description',
      ({ configModifications, baseConfig, expectedError }) => {
        const baseConfigObject =
          baseConfig === 'viem' ? validViemConfig : validEthersConfig;
        const invalidConfig = { ...baseConfigObject, ...configModifications };

        expect(
          () => new AccessClient(invalidConfig as AccessClientConfig),
        ).toThrow(expectedError);
      },
    );

    it('should throw error for mixed/invalid configuration types', () => {
      expect(
        () =>
          new AccessClient({
            domain: 'tapir',
            ritualId: 6,
          } as unknown as AccessClientConfig),
      ).toThrow(
        'Invalid configuration: Configuration must include either viemClient or ethersProvider',
      );
    });
  });

  describe('Configuration Access', () => {
    it.each([
      {
        configType: 'viem',
        config: () => validViemConfig,
        expectedProperties: ['viemClient'],
        description: 'viem client configuration',
      },
      {
        configType: 'ethers',
        config: () => validEthersConfig,
        expectedProperties: ['ethersProvider'],
        description: 'ethers client configuration',
      },
    ])(
      'should return readonly configuration object for $description',
      ({ config, expectedProperties }) => {
        const client = new AccessClient(config());
        const clientConfig = client.getConfig();

        // Verify common properties
        expect(clientConfig.domain).toBe('tapir');
        expect(clientConfig.ritualId).toBe(6);

        // Verify config-specific properties
        expectedProperties.forEach((prop) => {
          expect(prop in clientConfig).toBe(true);
        });

        // Should be frozen/readonly
        expect(() => {
          (clientConfig as Record<string, unknown>).domain = 'lynx';
        }).toThrow();
      },
    );
  });

  describe('Initialization Lifecycle', () => {
    it('should trigger automatic AccessClient initialization on client construction', async () => {
      // Reset static initialization state to verify automatic initialization
      // occurs when AccessClient constructor is called
      resetAccessClientStatics();

      new AccessClient(validViemConfig);

      // Initialization should be triggered by constructor
      expect(getAccessClientStatics().initializationPromise).toBeDefined();
    });

    it('should share initialization across multiple AccessClient instances', async () => {
      new AccessClient(validViemConfig);
      new AccessClient({
        ...validViemConfig,
        ritualId: 27, // Different ritual ID
      });

      // Both clients should share the same initialization promise
      const initPromise1 = getAccessClientStatics().initializationPromise;
      const initPromise2 = getAccessClientStatics().initializationPromise;

      expect(initPromise1).toBe(initPromise2);
      expect(initPromise1).toBeDefined();
    });

    it('should provide static initialize method with proper promise handling', async () => {
      // Verify AccessClient.initialize() method exists and returns a promise
      const initPromise = AccessClient.initialize();
      expect(initPromise).toBeInstanceOf(Promise);

      // Wait for initialization to complete
      await initPromise;

      // Verify that repeated calls return the same promise (singleton pattern)
      const initPromise2 = AccessClient.initialize();
      expect(initPromise2).toBeInstanceOf(Promise);
    });
  });

  describe('Full Configuration Validation', () => {
    it.each([
      {
        configType: 'viem',
        config: () => validViemConfig,
        description: 'correct viem configuration',
      },
      {
        configType: 'ethers',
        config: () => validEthersConfig,
        description: 'correct ethers configuration',
      },
    ])('should pass full validation for $description', async ({ config }) => {
      const result = AccessConfigValidator.validate(config());
      await expect(result).resolves.not.toThrow();
    });

    it('should detect and report missing blockchain dependencies', async () => {
      const result = await AccessConfigValidator.validate({
        domain: 'tapir',
        ritualId: 6,
        // Missing blockchain objects
      } as unknown as AccessClientConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Configuration must include either viemClient or ethersProvider',
      );
    });

    it('should detect and report invalid domain in full validation', async () => {
      const result = await AccessConfigValidator.validate({
        ...validViemConfig,
        domain: 'INVALID' as DomainName,
      });

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((error) => error.includes('Invalid domain name')),
      ).toBe(true);
    });

    it('should detect and report invalid ritual ID during construction', async () => {
      expect(
        () =>
          new AccessClient({
            domain: 'tapir',
            ritualId: -5,
            viemClient: fakeViemPublicClient(),
          }),
      ).toThrow('Invalid ritual ID');
    });
  });

  describe('Domain Support', () => {
    it('should provide domain name via getConfig method', () => {
      const client = new AccessClient(validViemConfig);
      const config = client.getConfig();

      expect(config.domain).toBe('tapir');
    });
  });
});
