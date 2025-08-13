/**
 * Example demonstrating how to use ViemEIP4361AuthProvider with viem clients
 */
import { ViemEIP4361AuthProvider } from '@nucypher/taco-auth';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
// Domain is a type, not a value - just use string literals for example
// import { Domain } from '@nucypher/shared';

async function viemAuthExample() {
  // Create viem clients
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http('https://polygon-rpc.com'),
  });

  // Create account from private key
  const account = privateKeyToAccount('0x...' as `0x${string}`);

  // Create viem-compatible auth provider
  const authProvider = new ViemEIP4361AuthProvider(
    publicClient,
    account,
    {
      // EIP4361AuthProviderParams only accepts domain and uri
      domain: 'my-app.com',
      uri: 'https://my-app.com',
    }
  );

  // Get or create authentication signature
  const authSignature = await authProvider.getOrCreateAuthSignature();
  console.log('Auth signature:', authSignature);

  // Use the auth provider with TACo domain (example)
  const domain = 'testnet'; // or 'mainnet' - Domain is a type alias for string
  
  // The auth provider is now ready to be used with TACo operations
  // For example, in a condition context or with custom authentication flows
  
  return {
    authProvider,
    authSignature,
    domain,
  };
}

// Export example function
export { viemAuthExample };

// Example of creating different types of auth providers
export async function createViemAuthProviders() {
  const publicClient = createPublicClient({
    chain: polygon,
    transport: http('https://polygon-rpc.com'),
  });

  const account = privateKeyToAccount('0x...' as `0x${string}`);

  // Simple auth provider (minimal configuration)
  const simpleAuthProvider = new ViemEIP4361AuthProvider(
    publicClient,
    account
  );

  // Configured auth provider with custom options
  const configuredAuthProvider = new ViemEIP4361AuthProvider(
    publicClient,
    account,
    {
      domain: 'dapp.example.com',
      uri: 'https://dapp.example.com/login',
    }
  );

  return {
    simpleAuthProvider,
    configuredAuthProvider,
  };
}
