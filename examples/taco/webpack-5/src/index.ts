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
import { hexlify } from 'ethers/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const runExample = async () => {
  await initialize();

  const ritualId = 0; // Replace with your own ritual ID
  const domain = domains.TESTNET;

  const provider = new ethers.providers.Web3Provider(window.ethereum!, 'any');
  await provider.send('eth_requestAccounts', []);
  const signer = provider.getSigner();

  const { chainId } = await provider.getNetwork();
  const amoyChainId = 80002;
  if (chainId !== amoyChainId) {
    // Switch to Polygon Amoy testnet
    await window.ethereum!.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexlify(amoyChainId) }],
    });
  }
  console.log("Signer's address:", await signer.getAddress());

  console.log('Encrypting message...');
  const message = toBytes('this is a secret');
  const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
    chain: 80002,
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
    provider,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    signer,
  );

  console.log('Decrypting message...');
  const decryptedBytes = await decrypt(
    provider,
    domain,
    messageKit,
    getPorterUri(domain),
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
