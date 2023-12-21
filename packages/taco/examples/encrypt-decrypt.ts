import { createPublicClient, createWalletClient, custom } from 'viem';

import 'viem/window';
import {
  conditions,
  decrypt,
  domains,
  encrypt,
  getPorterUri,
  initialize,
  ThresholdMessageKit,
  toBytes,
} from '../src';

const ritualId = 1;

const run = async () => {
  // The data encryptor runs this part
  const doEncrypt = async (message: string) => {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider detected');
    }

    // We have to initialize TACo library first
    await initialize();

    const publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });
    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    const ownsNFT = new conditions.predefined.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
      chain: 5,
    });
    const messageKit = await encrypt(
      publicClient,
      domains.TESTNET,
      message,
      ownsNFT,
      ritualId,
      walletClient,
    );
    return messageKit;
  };

  // The data recipient runs this part
  const doDecrypt = async (messageKit: ThresholdMessageKit) => {
    if (!window.ethereum) {
      throw new Error('No Ethereum provider detected');
    }

    // We have to initialize TACo library first
    await initialize();

    const publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });
    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    const decryptedMessage = await decrypt(
      publicClient,
      domains.TESTNET,
      messageKit,
      getPorterUri(domains.TESTNET),
      walletClient,
    );
    return decryptedMessage;
  };

  const message = 'my secret message';
  const encryptedMessage = await doEncrypt(message);
  const decryptedMessage = await doDecrypt(encryptedMessage);

  if (decryptedMessage === toBytes(message)) {
    console.log('Success!');
  }
};

run();
