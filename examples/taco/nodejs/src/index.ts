import { format } from 'node:util';

import {
  ThresholdMessageKit,
  conditions,
  decrypt,
  domains,
  encrypt,
  fromBytes,
  initialize,
  toBytes,
  toHexString,
} from '@nucypher/taco';
import {
  EIP4361AuthProvider,
  SelfDelegateProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import * as dotenv from 'dotenv';
import { Wallet, ethers } from 'ethers';

dotenv.config();

const rpcProviderUrl = process.env.RPC_PROVIDER_URL;
if (!rpcProviderUrl) {
  throw new Error('RPC_PROVIDER_URL is not set.');
}

const encryptorPrivateKey = process.env.ENCRYPTOR_PRIVATE_KEY;
if (!encryptorPrivateKey) {
  throw new Error('ENCRYPTOR_PRIVATE_KEY is not set.');
}

const consumerPrivateKey = process.env.CONSUMER_PRIVATE_KEY;
if (!consumerPrivateKey) {
  throw new Error('CONSUMER_PRIVATE_KEY is not set.');
}

const domain = process.env.DOMAIN || domains.TESTNET;
const ritualId = parseInt(process.env.RITUAL_ID || '6');
const provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);
const CHAIN_ID_FOR_DOMAIN = {
  [domains.MAINNET]: 137,
  [domains.TESTNET]: 80002,
  [domains.DEVNET]: 80002,
};
const chainId = CHAIN_ID_FOR_DOMAIN[domain];

console.log('Domain:', domain);
console.log('Ritual ID:', ritualId);
console.log('Chain ID:', chainId);

const encryptToBytes = async (messageString: string) => {
  const encryptorSigner = new ethers.Wallet(encryptorPrivateKey);
  console.log(
    "Encryptor signer's address:",
    await encryptorSigner.getAddress(),
  );

  const message = toBytes(messageString);
  console.log(format('Encrypting message ("%s") ...', messageString));

  const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
    chain: chainId,
    method: 'eth_getBalance',
    parameters: [':userAddress', 'latest'],
    returnValueTest: {
      comparator: '>=',
      value: 0,
    },
  });
  console.assert(
    hasPositiveBalance.requiresAuthentication(),
    'Condition requires authentication',
  );

  const ephemeralPrivateKey = Wallet.createRandom().privateKey;
  const selfDelegateProvider = new SelfDelegateProvider(encryptorSigner);
  
  const appSideSigner = await selfDelegateProvider.createSelfDelegatedAppSideSigner(ephemeralPrivateKey);

  const messageKit = await encrypt(
    provider,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    appSideSigner,
  );

  return messageKit.toBytes();
};

const decryptFromBytes = async (encryptedBytes: Uint8Array) => {
  const consumerSigner = new ethers.Wallet(consumerPrivateKey);
  console.log(
    "\nConsumer signer's address:",
    await consumerSigner.getAddress(),
  );

  const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
  console.log('Decrypting message ...');
  const siweParams = {
    domain: 'localhost',
    uri: 'http://localhost:3000',
  };
  const conditionContext =
    conditions.context.ConditionContext.fromMessageKit(messageKit);

  // illustrative optional example of checking what context parameters are required
  // unnecessary if you already know what the condition contains
  if (
    conditionContext.requestedContextParameters.has(USER_ADDRESS_PARAM_DEFAULT)
  ) {
    const authProvider = new EIP4361AuthProvider(
      provider,
      consumerSigner,
      siweParams,
    );
    conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);
  }
  return decrypt(provider, domain, messageKit, conditionContext);
};

const runExample = async () => {
  // Make sure the provider is connected to the correct network
  const network = await provider.getNetwork();
  if (network.chainId !== chainId) {
    throw `Please connect your provider to an appropriate network ${chainId}`;
  }
  await initialize();

  const messageString = 'This is a secret 🤐';
  const encryptedBytes = await encryptToBytes(messageString);
  console.log('Ciphertext: ', toHexString(encryptedBytes));

  const decryptedBytes = await decryptFromBytes(encryptedBytes);
  const decryptedMessageString = fromBytes(decryptedBytes);
  console.log('Decrypted message:', decryptedMessageString);

  console.assert(
    decryptedMessageString === messageString,
    'Decrypted message is different to original message',
  );
};

runExample().then(() => {
  console.log('Example finished');
});
