import { ethers } from 'ethers';

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
    // We have to initialize TACo library first
    await initialize();

    // @ts-ignore
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const ownsNFT = new conditions.predefined.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
      chain: 5,
    });
    const messageKit = await encrypt(
      web3Provider,
      domains.TESTNET,
      message,
      ownsNFT,
      ritualId,
      web3Provider.getSigner(),
    );
    return messageKit;
  };

  // The data recipient runs this part
  const doDecrypt = async (messageKit: ThresholdMessageKit) => {
    // We have to initialize TACo library first
    await initialize();

    // @ts-ignore
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    const decryptedMessage = await decrypt(
      web3Provider,
      domains.TESTNET,
      messageKit,
      getPorterUri(domains.TESTNET),
      web3Provider.getSigner(),
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
