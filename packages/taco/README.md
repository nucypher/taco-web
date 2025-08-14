# `@nucypher/taco`

### [`nucypher/taco-web`](../../README.md)

## Supported `taco` versions

To use `taco`, you need to connect with a proper network: `mainnet`, `testnet`, or `devnet`. You can find a proper version for each network in the [npmjs.com package tags](https://www.npmjs.com/package/@nucypher/taco?activeTab=versions).

Visit [our documentation](https://docs.taco.build/taco-integration/) to learn more.

## Usage

First, install the package:

```bash
$ yarn add @nucypher/taco ethers@5.7.2
```

### Encrypt your data

```typescript
import { conditions, domains, encrypt, initialize } from '@nucypher/taco';
import { ethers } from 'ethers';

// We have to initialize the TACo library first
await initialize();

const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

const ownsNFT = new conditions.predefined.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});

const message = 'my secret message';

const messageKit = await encrypt(
  web3Provider,
  domains.TESTNET,
  message,
  ownsNFT,
  ritualId,
  web3Provider.getSigner(),
);
```

### Decrypt your data

```typescript
import { decrypt, domains, getPorterUri, initialize } from '@nucypher/taco';
import { ethers } from 'ethers';

// We have to initialize the TACo library first
await initialize();

const web3Provider = new ethers.providers.Web3Provider(window.ethereum);

const decryptedMessage = await decrypt(
  web3Provider,
  domains.TESTNET,
  messageKit,
  web3Provider.getSigner(),
);
```

## Viem Support

The TACo SDK also supports [viem](https://viem.sh) as an alternative to ethers.js:

```bash
$ yarn add @nucypher/taco viem
```

```typescript
import { encryptWithViem, decryptWithViem } from '@nucypher/taco';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const viemClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});
const viemAccount = privateKeyToAccount('0x...');

// Encrypt with viem
const messageKit = await encryptWithViem(
  viemClient,
  'testnet',
  'my secret message',
  ownsNFT,
  ritualId,
  viemAccount,
);

// Decrypt with viem
const decryptedMessage = await decryptWithViem(
  viemClient,
  'testnet',
  messageKit,
);
```

For detailed viem documentation, see [VIEM_SUPPORT.md](./VIEM_SUPPORT.md).

## Learn more

Please find developer documentation for
TACo [here](https://docs.taco.build/).
