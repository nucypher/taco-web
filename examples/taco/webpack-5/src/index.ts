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
import { ethers } from 'ethers';
import { hexlify } from "ethers/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const runExample = async () => {
  await initialize();

  const provider = new ethers.providers.Web3Provider(window.ethereum!, 'any');
  await provider.send('eth_requestAccounts', []);
  const signer = provider.getSigner();

  const { chainId } = await provider.getNetwork();
  const mumbaiChainId = 80001;
  if (chainId !== mumbaiChainId) {
    // Switch to Polygon Mumbai testnet
    await window.ethereum!.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexlify(mumbaiChainId) }],
    });
  }
  console.log("Signer's address:", await signer.getAddress());

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
  const ritualId = 5; // Replace with your own ritual ID
  const messageKit = await encrypt(
    provider,
    domains.TESTNET,
    message,
    hasPositiveBalance,
    ritualId,
    signer,
  );

  console.log('Decrypting message...');
  const decryptedBytes = await decrypt(
    provider,
    domains.TESTNET,
    messageKit,
    getPorterUri(domains.TESTNET),
    signer,
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
