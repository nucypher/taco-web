import {
  conditions,
  decrypt,
  domains,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
  toBytes,
} from '@nucypher/taco';
import { createPublicClient, createWalletClient, custom, toHex } from 'viem';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const runExample = async () => {
  await initialize();

  const ritualId = 5; // Replace with your own ritual ID
  const domain = domains.TESTNET;

  const publicClient = createPublicClient({
    transport: custom(window.ethereum),
  });
  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });
  const chainId = await walletClient.getChainId();
  const [address] = await walletClient.getAddresses();

  const mumbaiChainId = 80001;
  if (chainId !== mumbaiChainId) {
    // Switch to Polygon Mumbai testnet
    await window.ethereum!.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: toHex(mumbaiChainId) }],
    });
  }
  console.log("Signer's address:", address);

  console.log('Encrypting message...');
  const message = toBytes('this is a secret');
  const hasPositiveBalance = new conditions.RpcCondition({
    chain: 80001,
    method: 'eth_getBalance',
    parameters: [':userAddress', 'latest'],
    returnValueTest: {
      comparator: '>',
      value: 0,
    },
  });
  console.assert(
    hasPositiveBalance.requiresSigner(),
    'Condition requires signer',
  );
  const messageKit = await encrypt(
    publicClient,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    walletClient,
  );

  console.log('Decrypting message...');
  const decryptedBytes = await decrypt(
    publicClient,
    domain,
    messageKit,
    getPorterUri(domain),
    walletClient,
  );
  const decryptedMessage = fromBytes(decryptedBytes);
  console.log('Decrypted message:', decryptedMessage);
};

runExample()
  .then(() => {
    console.log('Example finished');
  })
  .catch((err) => {
    console.error('Example failed:', err);
  });
