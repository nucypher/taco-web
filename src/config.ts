type Network = 'mainnet' | 'tapir' | 'oryx' | 'lynx';

const PORTER_URIS: Record<Network, string> = {
  // TODO: Make sure these are correct
  mainnet: 'https://porter.nucypher.community',
  tapir: 'https://porter-tapir.nucypher.community',
  oryx: 'https://porter-oryx.nucypher.community',
  lynx: 'https://porter-lynx.nucypher.community',
};

export const getPorterUri = (network: Network): string => {
  if (!Object.values(PORTER_URIS).includes(network)) {
    throw new Error(`No default Porter URI found for network: ${network}`);
  }
  return PORTER_URIS[network];
};
