/**
 * Example usage of TACo SDK with viem
 *
 * This example demonstrates how to use the new viem-compatible functions
 * for encryption and decryption with TACo.
 */

// import { createPublicClient, createWalletClient, http } from 'viem';
// import { polygonAmoy } from 'viem/chains';
// import { privateKeyToAccount } from 'viem/accounts';
// import {
//   encryptWithViem,
//   decryptWithViem
// } from '../index';
// import * as conditions from '../conditions';

/**
 * Example 1: Using viem clients directly with the new viem-compatible functions
 */
export async function exampleWithViemClients() {
  // This example shows how you would use it (commented out due to viem dependency)
  /*
  // 1. Create viem clients (your existing setup)
  const viemPublicClient = createPublicClient({
    chain: polygonAmoy, // or your main app's chain
    transport: http()
  });

  const viemAccount = privateKeyToAccount('0x...');
  const viemWalletClient = createWalletClient({
    account: viemAccount,
    chain: polygonAmoy,
    transport: http()
  });

  // 2. Create a condition (same as before)
  const condition = conditions.predefined.erc20Balance({
    contractAddress: '0x...',
    standardContractType: 'ERC20',
    chain: 80002, // Polygon Amoy
    method: 'balanceOf',
    parameters: [':userAddress'],
    returnValueTest: {
      comparator: '>=',
      value: 1000000000000000000 // 1 token
    }
  });

  // 3. Encrypt using viem (automatically handles network conversion)
  const encryptedKit = await encryptWithViem(
    viemPublicClient, // Your viem public client
    'lynx',           // TACo domain  
    'Hello, secret!', // Message to encrypt
    condition,        // Access condition
    27,               // Ritual ID
    viemAccount       // Your viem account
  );

  // 4. Decrypt using viem
  const decryptedMessage = await decryptWithViem(
    viemPublicClient,
    'lynx',
    encryptedKit
  );

  console.log('Decrypted:', new TextDecoder().decode(decryptedMessage));
  */
}

/**
 * Example 2: Using TACo domain convenience functions (recommended for most use cases)
 */
export async function exampleWithTacoDomain() {
  /*
  const account = privateKeyToAccount('0x...');
  
  const condition = conditions.predefined.timelock({
    returnValueTest: {
      comparator: '>',
      value: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    }
  });

  // Encrypt - automatically uses correct network for TACo domain
  const encryptedKit = await encryptForTacoDomain(
    'lynx',           // TACo domain - automatically creates Polygon Amoy provider
    'Hello, secret!', // Message
    condition,        // Condition
    27,               // Ritual ID
    account           // Your account
  );

  // Decrypt - automatically uses correct network for TACo domain
  const decryptedMessage = await decryptForTacoDomain(
    'lynx',
    encryptedKit
  );

  console.log('Decrypted:', new TextDecoder().decode(decryptedMessage));
  */
}

/**
 * Example 3: Browser usage with MetaMask
 */
export async function exampleWithBrowserWallet() {
  /*
  // In a browser environment with MetaMask
  import { createWalletClient, custom } from 'viem';
  
  // Connect to MetaMask
  const [viemAccount] = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  const viemWalletClient = createWalletClient({
    transport: custom(window.ethereum),
    account: viemAccount
  });

  // Encrypt - user will sign through MetaMask
  const encryptedKit = await encryptForTacoDomain(
    'lynx',
    'Hello from browser!',
    condition,
    27,
    viemWalletClient.account
  );

  // Decrypt
  const decryptedMessage = await decryptForTacoDomain(
    'lynx',
    encryptedKit
  );
  */
}

/**
 * Example 5: Network separation (your main app on one network, TACo on another)
 */
export async function exampleNetworkSeparation() {
  /*
  // Your main app might be on Ethereum mainnet
  const viemMainnetClient = createPublicClient({
    chain: mainnet,
    transport: http()
  });

  const viemAccount = privateKeyToAccount('0x...');

  // But TACo operations happen on Polygon Amoy
  // The encryptForTacoDomain function handles this automatically
  const encryptedKit = await encryptForTacoDomain(
    'lynx',           // Uses Polygon Amoy regardless of your main app's network
    'Cross-chain secret!',
    condition,
    27,
    viemAccount       // Same account, different network for TACo ops
  );

  // This is exactly what your TacoEncryption class does!
  */
}

/**
 * Example 6: Using ViemEIP4361AuthProvider for authentication
 */
export async function exampleWithViemAuthProvider() {
  /*
  // Import the viem auth provider
  import { ViemEIP4361AuthProvider } from '@nucypher/taco-auth';
  
  // Create viem clients (same as before)
  const viemPublicClient = createPublicClient({
    chain: polygonAmoy,
    transport: http()
  });
  
  const viemAccount = privateKeyToAccount('0x...');
  
  // Create a viem-native auth provider
  const authProvider = new ViemEIP4361AuthProvider(
    viemPublicClient,
    viemAccount,
    {
      domain: 'my-dapp.com',
      statement: 'Sign in to access encrypted content',
      uri: 'https://my-dapp.com/auth',
      version: '1',
      chainId: polygonAmoy.id,
      nonce: 'secure-random-nonce',
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }
  );
  
  // Get authentication signature
  const authSignature = await authProvider.getOrCreateAuthSignature();
  console.log('Auth signature:', authSignature);
  
  // Use the auth provider in your application
  // (The auth provider handles all the viem ↔ ethers conversion internally)
  
  // You can also access the underlying ethers provider if needed
  const ethersAuthProvider = authProvider.getEthersAuthProvider();
  
  // Benefits:
  // ✅ No manual viem ↔ ethers conversion
  // ✅ Clean viem-native API
  // ✅ Automatic signing through viem account
  // ✅ Full EIP4361 compliance
  */
}
