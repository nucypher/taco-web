import { getContract } from '@nucypher/nucypher-contracts';
import { ethers } from 'ethers';

import { Domain } from '../../porter.js';
import { ChecksumAddress } from '../../types.js';
import { DEFAULT_WAIT_N_CONFIRMATIONS } from '../const.js';
import {
  GlobalAllowList,
  GlobalAllowList__factory,
} from '../ethers-typechain/index.js';

export class GlobalAllowListAgent {
  public static async registerEncrypters(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    domain: Domain,
    ritualId: number,
    encrypters: ChecksumAddress[],
  ): Promise<void> {
    const globalAllowList = await this.connectReadWrite(
      provider,
      domain,
      signer,
    );
    const tx = await globalAllowList.authorize(ritualId, encrypters);
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
  }

  private static async connectReadOnly(
    provider: ethers.providers.Provider,
    domain: Domain,
  ) {
    return await this.connect(provider, domain);
  }

  private static async connectReadWrite(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer: ethers.Signer,
  ) {
    return await this.connect(provider, domain, signer);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    domain: Domain,
    signer?: ethers.Signer,
  ): Promise<GlobalAllowList> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(
      domain,
      network.chainId,
      'GlobalAllowList',
    );
    return GlobalAllowList__factory.connect(
      contractAddress,
      signer ?? provider,
    );
  }
}
