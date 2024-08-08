import { domains, ETH_ADDRESS_REGEXP } from '@nucypher/shared';
import { AuthProviders, EIP4361_AUTH_METHOD } from '@nucypher/taco-auth';
import { createPublicClient, http } from 'viem';
import { mainnet, sepolia } from 'viem/chains';
import { normalize } from 'viem/ens';
import { z } from 'zod';

import { Condition } from '../condition';
import { OmitConditionType } from '../shared';

export const EnsAddressOwnershipConditionType = 'ensOwnership';

export const ensAddressOwnershipConditionSchema = z.object({
  conditionType: z
    .literal(EnsAddressOwnershipConditionType)
    .default(EnsAddressOwnershipConditionType),
  ensName: z.string().min(3),
  domain: z.string(),
  resolvedAddress: z.string().regex(ETH_ADDRESS_REGEXP).length(42).optional(),
});

export type EnsAddressOwnershipConditionProps = z.infer<
  typeof ensAddressOwnershipConditionSchema
>;

export class EnsAddressOwnershipCondition extends Condition {
  authProviders?: AuthProviders;

  constructor(
    value: OmitConditionType<EnsAddressOwnershipConditionProps> & {
      authProviders?: AuthProviders | undefined;
    },
  ) {
    super(ensAddressOwnershipConditionSchema, {
      conditionType: EnsAddressOwnershipConditionType,
      ...value,
    });
    if (value?.authProviders) {
      this.authProviders = value?.authProviders;
    }
    if (this.authProviders) {
      this.validate(this.authProviders);
    }
  }

  public async resolve(): Promise<void> {
    const client = createPublicClient({
      chain: this.value.domain === domains.mainnet ? mainnet : sepolia,
      transport: http(),
    });

    this.value.resolvedAddress = await client.getEnsAddress({
      name: normalize(this.value.ensName),
    });
    if (!this.value.resolvedAddress) {
      throw new Error('ENS name could not be resolved');
    }
  }

  public async validate(authProviders: AuthProviders) {
    await this.resolve();
    const signerAddress =
      await authProviders[EIP4361_AUTH_METHOD]?.getOrCreateAuthSignature();
    if (this.value.resolvedAddress !== signerAddress?.address) {
      throw new Error(
        `Error: ENS ownership verification failed. The signer is not the owner of the ${this.value.ensName} ENS`,
      );
    }
  }
}
