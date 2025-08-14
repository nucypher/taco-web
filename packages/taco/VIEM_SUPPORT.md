# Viem Support

The TACo SDK supports [viem](https://viem.sh) for encryption and decryption
operations.

## Installation

Viem is optional. Install it only if you want to use viem instead of ethers.js:

```bash
npm install viem
```

### For Authentication Providers

If you need viem-compatible authentication providers (like `ViemEIP4361AuthProvider`), install the taco-auth package:

```bash
npm install @nucypher/taco-auth viem
```

## Sample Usage

```typescript
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { encryptWithViem, decryptWithViem } from '@nucypher/taco';
import * as conditions from '@nucypher/taco/conditions';

// Create viem client
const viemPublicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
// Create account
const viemAccount = privateKeyToAccount('0x...');

// Create access condition
const condition = conditions.predefined.erc20Balance({
  contractAddress: '0x...',
  standardContractType: 'ERC20',
  chain: 80002,
  method: 'balanceOf',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>',
    value: 0,
  },
});

// Encrypt a message
const encryptedKit = await encryptWithViem(
  viemPublicClient,
  'lynx',
  'Hello, secret!',
  condition,
  27, // ritual ID
  viemAccount,
);

// Decrypt the message
const decryptedMessage = await decryptWithViem(
  viemPublicClient,
  'lynx',
  encryptedKit,
);

console.log(new TextDecoder().decode(decryptedMessage)); // "Hello, secret!"
```

### Viem-Compatible Functions

#### `encryptWithViem(viemPublicClient, domain, message, condition, ritualId, viemAccount)`

Encrypts a message using viem objects.

- `viemPublicClient`: `PublicClient` - Viem PublicClient for network operations
- `domain`: `Domain` - TACo domain ('lynx', 'TESTNET', 'MAINNET')
- `message`: `Uint8Array | string` - Message to encrypt
- `condition`: `Condition` - Access condition for decryption
- `ritualId`: `number` - DKG ritual ID
- `viemAccount`: `Account` - Viem account for signing

Returns: `Promise<ThresholdMessageKit>`

#### `decryptWithViem(viemPublicClient, domain, messageKit, context?, porterUris?)`

Decrypts a message using viem objects.

- `viemPublicClient`: `PublicClient` - Viem PublicClient for network operations
- `domain`: `Domain` - TACo domain
- `messageKit`: `ThresholdMessageKit` - Encrypted message kit
- `context?`: `ConditionContext` - Optional context for conditions
- `porterUris?`: `string[]` - Optional Porter service URIs

Returns: `Promise<Uint8Array>`

## Viem Authentication Providers

For applications that need authentication providers compatible with viem, use the `@nucypher/taco-auth` package:

### ViemEIP4361AuthProvider

Creates an EIP-4361 compliant authentication provider from viem objects:

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { ViemEIP4361AuthProvider } from '@nucypher/taco-auth';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
const account = privateKeyToAccount('0x...');

const authProvider = await ViemEIP4361AuthProvider.create(
  publicClient,
  account,
  {
    domain: 'my-app.com',
    uri: 'https://my-app.com',
  },
);

const authSignature = await authProvider.getOrCreateAuthSignature();
```

**Parameters:**

- `viemPublicClient`: `PublicClient` - Viem public client for network operations
- `viemAccount`: `Account` - Viem account for signing
- `options?`: `EIP4361AuthProviderParams` - Optional domain and URI for EIP-4361 messages

**Methods:**

- `getOrCreateAuthSignature()`: Returns authentication signature for TACo operations
- `ethersProvider`: Getter for underlying ethers-compatible auth provider

## Package Architecture

### @nucypher/taco

- **Purpose**: Core encryption and decryption functionality
- **Viem Functions**: `encryptWithViem()`, `decryptWithViem()`
- **Dependencies**: Only viem functions for encryption operations

### @nucypher/taco-auth

- **Purpose**: Authentication providers and signing utilities
- **Viem Functions**: `ViemEIP4361AuthProvider`
- **Dependencies**: Viem authentication and EIP-4361 signing

This separation follows clean architecture principles - use the appropriate package based on your needs:

- **Encryption only**: Install `@nucypher/taco` + `viem`
- **Authentication required**: Install both `@nucypher/taco` + `@nucypher/taco-auth` + `viem`
