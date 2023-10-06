import { ethers } from 'ethers';

import { ChecksumAddress } from '../../types';
import { GlobalAllowList, GlobalAllowList__factory } from '../ethers-typechain';
import { DEFAULT_WAIT_N_CONFIRMATIONS, getContract } from '../registry';

export class GlobalAllowListAgent {
  public static async registerEncrypters(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    ritualId: number,
    encrypters: ChecksumAddress[],
  ): Promise<void> {
    const globalAllowList = await this.connectReadWrite(provider, signer);
    const tx = await globalAllowList.authorize(ritualId, encrypters);
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
  }

  private static async connectReadOnly(provider: ethers.providers.Provider) {
    return await this.connect(provider);
  }

  private static async connectReadWrite(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
  ) {
    return await this.connect(provider, signer);
  }

  private static async connect(
    provider: ethers.providers.Provider,
    signer?: ethers.Signer,
  ): Promise<GlobalAllowList> {
    const network = await provider.getNetwork();
    const contractAddress = getContract(network.chainId, 'GLOBAL_ALLOW_LIST');
    return GlobalAllowList__factory.connect(
      contractAddress,
      signer ?? provider,
    );
  }
}
