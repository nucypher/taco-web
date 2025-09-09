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

## Function Overloads

The same `encrypt` and `decrypt` functions work with both ethers.js and viem.
TypeScript automatically selects the correct implementation based on your
parameter types:

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
const viemPublicClient = createPublicClient({
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
  viemPublicClient, // viem PublicClient - TypeScript detects this
  domains.DEVNET, // or 'lynx'
  'Hello, secret!',
  condition,
  27, // ritual ID
  viemAccount, // viem Account - TypeScript detects this
);

// Same decrypt function works with viem
const decryptedMessage = await decrypt(
  viemPublicClient,
  domains.DEVNET,
  encryptedKit,
);

console.log(new TextDecoder().decode(decryptedMessage)); // "Hello, secret!"
```

## Automatic Library Detection

The overload system automatically detects which library you're using:

```typescript
import { encrypt, decrypt, domains } from '@nucypher/taco';
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Using ethers.js - automatically uses ethers implementation
const ethersEncrypted = await encrypt(
  ethersProvider, // ethers.providers.Provider
  domains.TESTNET,
  message,
  condition,
  ritualId,
  ethersSigner, // ethers.Signer
);

// Using viem - automatically uses viem implementation
const viemEncrypted = await encrypt(
  viemPublicClient, // viem PublicClient
  domains.TESTNET,
  message,
  condition,
  ritualId,
  viemAccount, // viem Account
);

// Both return the same ThresholdMessageKit type
// Both can be decrypted with either library
```

## Function Signatures

The overloaded functions support both ethers.js and viem parameter types:

### `encrypt()` - Viem Overload

```typescript
function encrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit>;
```

**Parameters:**

- `viemPublicClient`: `PublicClient` - Viem PublicClient for network operations
- `domain`: `Domain` - TACo domain ('lynx', 'tapir', 'mainnet')
- `message`: `Uint8Array | string` - Message to encrypt
- `condition`: `Condition` - Access condition for decryption
- `ritualId`: `number` - DKG ritual ID
- `viemAuthSigner`: `Account` - Viem account for signing

**Returns:** `Promise<ThresholdMessageKit>`

### `decrypt()` - Viem Overload

```typescript
function decrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;
```

**Parameters:**

- `viemPublicClient`: `PublicClient` - Viem PublicClient for network operations
- `domain`: `Domain` - TACo domain
- `messageKit`: `ThresholdMessageKit` - Encrypted message kit
- `context?`: `ConditionContext` - Optional context for conditions
- `porterUris?`: `string[]` - Optional Porter service URIs

**Returns:** `Promise<Uint8Array>`

## Viem Authentication Providers

For applications that need authentication providers compatible with viem, use
the `@nucypher/taco-auth` package:

### EIP4361AuthProvider with Viem Support

The consolidated `EIP4361AuthProvider` now supports both ethers.js and viem
through static factory methods:

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

// Viem usage - uses async factory method
const authProvider = await EIP4361AuthProvider.create(publicClient, account, {
  domain: 'my-app.com',
  uri: 'https://my-app.com',
});

const authSignature = await authProvider.getOrCreateAuthSignature();
```

**Viem Factory Method Parameters:**

- `viemPublicClient`: `PublicClient` - Viem public client for network operations
- `viemAccount`: `Account` - Viem account for signing
- `options?`: `EIP4361AuthProviderParams` - Optional domain and URI for EIP-4361
  messages

**Ethers.js Usage (for comparison):**

```typescript
import { ethers } from 'ethers';
import { EIP4361AuthProvider } from '@nucypher/taco-auth';

const provider = new ethers.providers.JsonRpcProvider();
const signer = new ethers.Wallet('0x...', provider);

// Ethers usage - can use constructor or factory method
const authProvider = new EIP4361AuthProvider(provider, signer);
// OR
const authProvider = await EIP4361AuthProvider.create(provider, signer);
```

**Methods:**

- `getOrCreateAuthSignature()`: Returns authentication signature for TACo
  operations

## Package Architecture

### @nucypher/taco

- **Purpose**: Core encryption and decryption functionality
- **Viem Functions**: `encrypt()`, `decrypt()` (automatic overload detection)
- **Dependencies**: Only viem functions for encryption operations

### @nucypher/taco-auth

- **Purpose**: Authentication providers and signing utilities
- **Viem Functions**: `EIP4361AuthProvider.create()` with viem parameter
  overloading
- **Dependencies**: Viem authentication and EIP-4361 signing

This separation follows clean architecture principles - use the appropriate
package based on your needs:

- **Encryption only**: Install `@nucypher/taco` + `viem`
- **Authentication required**: Install both `@nucypher/taco` +
  `@nucypher/taco-auth` + `viem`
