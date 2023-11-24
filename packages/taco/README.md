# `@nucypher/taco`

### [`nucypher/taco-web`](../../README.md)

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
  getPorterUri(domains.TESTNET),
  web3Provider.getSigner(),
);
```

## Learn more

Please find developer documentation for
TACo [here](https://docs.threshold.network/app-development/threshold-access-control-tac).
