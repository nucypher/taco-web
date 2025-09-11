# Viem Support

The TACo SDK provides unified `encrypt` and `decrypt` functions that work
seamlessly with both [ethers.js](https://docs.ethers.org/) and
[viem](https://viem.sh) through TypeScript function overloads. The same function
names automatically detect which library you're using based on parameter types.

## Installation

Viem is optional. Install it only if you want to use viem instead of ethers.js:

```bash
npm install viem
```

### For Authentication Providers

If you need authentication providers that work with viem, install the taco-auth
package:

```bash
npm install @nucypher/taco-auth viem
```

## Supported Libraries

The same `encrypt` and `decrypt` functions work with both ethers.js and viem.

Here is how to use them with viem:

```typescript
import {
  encrypt,
  decrypt,
  conditions,
  domains,
  initialize,
} from '@nucypher/taco';
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Initialize TACo
await initialize();

// Create viem public client
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
// Create account
const viemAccount = privateKeyToAccount('0x...');

// Create access condition
const condition = new conditions.predefined.erc20.ERC20Balance({
  contractAddress: '0x...',
  chain: 80002,
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});

// Same function names work with viem - TypeScript automatically detects the right overload
const encryptedKit = await encrypt(
  publicClient, // viem PublicClient
  domains.DEVNET, // or 'lynx'
  'Hello, secret!',
  condition,
  27, // ritual ID
  viemAccount, // viem Account
);

// Same decrypt function works with viem
const decryptedMessage = await decrypt(
  publicClient,
  domains.DEVNET,
  encryptedKit,
);

console.log(new TextDecoder().decode(decryptedMessage)); // "Hello, secret!"
```

## Authentication Providers

For applications that need authentication providers compatible with viem, use
the `@nucypher/taco-auth` package:

### EIP4361AuthProvider

`EIP4361AuthProvider` also supports both ethers.js and viem:

```typescript
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { EIP4361AuthProvider } from '@nucypher/taco-auth';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
const account = privateKeyToAccount('0x...');

// Viem usage
const authProvider = new EIP4361AuthProvider(publicClient, account, {
  domain: 'my-app.com',
  uri: 'https://my-app.com',
});

const authSignature = await authProvider.getOrCreateAuthSignature();
```

**Ethers.js Usage (for comparison):**

```typescript
import { ethers } from 'ethers';
import { EIP4361AuthProvider } from '@nucypher/taco-auth';

const provider = new ethers.providers.JsonRpcProvider();
const signer = new ethers.Wallet('0x...', provider);

// Ethers usage
const authProvider = new EIP4361AuthProvider(provider, signer);
```

## Installation

Use the appropriate package based on your needs:

- **Encryption only**: Install `@nucypher/taco` + `viem`
- **Authentication required**: Install both `@nucypher/taco` +
  `@nucypher/taco-auth` + `viem`
