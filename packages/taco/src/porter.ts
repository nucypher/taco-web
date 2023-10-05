import { getPorterUri as doGetPorterUri } from '@nucypher/shared';

type TacoDomain = 'lynx' | 'tapir';

export const TACO_DOMAIN: Record<string, TacoDomain> = {
  DEV: 'lynx',
  TESTNET: 'tapir',
};

export const getPorterUri = (domain: TacoDomain): string => {
  const tacoDomainKeys = Object.keys(TACO_DOMAIN);
  if (!tacoDomainKeys.includes(domain)) {
    throw new Error(`${domain} is not a valid TACo domain.`);
  }
  return doGetPorterUri(domain);
};

export { fromBytes, initialize, toBytes, toHexString } from '@nucypher/shared';
