import { getContract } from '@nucypher/nucypher-contracts';
import { PublicClient, WalletClient } from 'viem';

import { Domain } from '../../porter';
import { ChecksumAddress } from '../../types';
import { publicClientToProvider, walletClientToSigner } from '../../viem';
import { DEFAULT_WAIT_N_CONFIRMATIONS } from '../const';
import { GlobalAllowList__factory } from '../ethers-typechain';

export class GlobalAllowListAgent {
  public static async registerEncrypters(
    walletClient: WalletClient,
    domain: Domain,
    ritualId: number,
    encrypters: ChecksumAddress[],
  ): Promise<void> {
    const globalAllowList = await this.connectReadWrite(walletClient, domain);
    const tx = await globalAllowList.authorize(ritualId, encrypters);
    await tx.wait(DEFAULT_WAIT_N_CONFIRMATIONS);
  }

  private static async connectReadOnly(
    publicClient: PublicClient,
    domain: Domain,
  ) {
    const chainId = await publicClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'GlobalAllowList');
    return GlobalAllowList__factory.connect(
      contractAddress,
      publicClientToProvider(publicClient),
    );
  }

  private static async connectReadWrite(
    walletClient: WalletClient,
    domain: Domain,
  ) {
    const chainId = await walletClient.getChainId();
    const contractAddress = getContract(domain, chainId, 'GlobalAllowList');
    return GlobalAllowList__factory.connect(
      contractAddress,
      walletClientToSigner(walletClient),
    );
  }
}
