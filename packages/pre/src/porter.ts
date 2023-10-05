import { getPorterUri as doGetPorterUri } from '@nucypher/shared';

type PreDomain = 'oryx';

export const PRE_DOMAIN: Record<string, PreDomain> = {
  TESTNET: 'oryx',
};

export const getPorterUri = (domain: PreDomain): string => {
  const preDomainKeys = Object.keys(PRE_DOMAIN);
  if (!preDomainKeys.includes(domain)) {
    throw new Error(`${domain} is not a valid PRE domain.`);
  }
  return doGetPorterUri(domain);
};

export { fromBytes, initialize, toBytes, toHexString } from '@nucypher/shared';
