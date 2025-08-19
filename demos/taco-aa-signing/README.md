# TACo Account Abstraction Demo

Shows how to create smart accounts with TACo's distributed threshold signatures and execute real transactions using Account Abstraction.

## What This Demo Does

1. **Creates Smart Account**: Uses TACo testnet signers to create a MultiSig smart account
2. **Shows Balance Changes**: Tracks ETH balances throughout the process
3. **Executes Real Transactions**: Transfers funds using TACo's threshold signatures
4. **Returns Funds**: Prevents accumulation by returning funds to the original EOA

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run the demo
npm start
```

## Configuration

Create `.env` file:

```env
# Ethereum Sepolia RPC endpoint
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Private key (needs test ETH on Sepolia)
PRIVATE_KEY=0x...

# ERC-4337 bundler endpoint (Pimlico)
BUNDLER_URL=https://api.pimlico.io/v2/sepolia/rpc?apikey=YOUR_KEY
```

## Demo Flow

```
🏗️  Create Smart Account with TACo Signers
📊 Show Initial Balances
💰 Fund Smart Account
🔧 Prepare Transaction
🔐 Sign with TACo Network (2-of-3 threshold)
🚀 Execute via Account Abstraction
📊 Show Final Balances
🎉 Complete & Exit
```

## Key Features

- **Real TACo Testnet**: Uses actual Ursula nodes as signers
- **Threshold Signatures**: 2-of-3 distributed signing
- **Balance Tracking**: Shows ETH movement at each step
- **Fund Management**: Returns funds to prevent accumulation
- **Single File**: Less than 200 lines of clean, working code

## Code Structure

The demo has two main helper functions:

```typescript
// Creates smart account with TACo signers
createTacoSmartAccount()

// Signs UserOperation with TACo network
signUserOpWithTaco()
```

All the core logic is in `src/index.ts` - easy to understand and modify.

## Example Output

```
🎬 Starting TACo Account Abstraction Demo

🏗️  Creating TACo smart account...
✅ Smart account created: 0x1F14beC...
📋 Threshold: 2 signatures required

📊 Initial Balances:
  EOA: 0.0421 ETH
  Smart Account: 0.002 ETH

🔧 Preparing transaction...
📋 Transfer amount: 0.001 ETH (returning funds to EOA)

🔐 Signing with TACo network...
✅ TACo signature collected (130 bytes)

🚀 Executing transaction...
✅ Transaction executed: 0xabc123...

📊 Final Balances:
  EOA: 0.0431 ETH
  Smart Account: 0.002 ETH (reserved for gas)

🎉 Demo completed successfully!
```

## Resources

- [TACo Documentation](https://docs.taco.build)
- [Account Abstraction (ERC-4337)](https://eips.ethereum.org/EIPS/eip-4337)
- [MetaMask Delegation Toolkit](https://github.com/MetaMask/delegation-toolkit)
