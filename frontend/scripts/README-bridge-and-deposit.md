# Bridge + Deposit Script

This script bridges USDC from a source chain (Ethereum, Polygon, Arbitrum, or Optimism) to Base Mainnet and automatically deposits it into the yield vault.

## Installation

First, install the required dependencies:

```bash
npm install @lifi/sdk @lifi/data-types dotenv tsx
```

Or if you prefer to use the local LI.FI SDK:

```bash
cd ../lifi-sdk/examples/node
pnpm install
```

## Setup

1. Add the following environment variables to `scripts/.env`:

```env
PRIVATE_KEY=0x...  # Your wallet private key (must have USDC on source chain)
BASE_MAINNET_RPC_URL=https://mainnet.base.org  # Optional, defaults to public RPC
YIELD_ORCHESTRATOR_ADDRESS=0x...  # From frontend/.env
USDC_ADDRESS=0x...  # USDC address on Base Mainnet (from frontend/.env)
AMOUNT_USDC=10  # Optional, defaults to 10 USDC
```

## Usage

```bash
tsx scripts/bridge-and-deposit.ts <source-chain>
```

### Supported Source Chains

- `ethereum` - Ethereum Mainnet (Chain ID: 1)
- `polygon` - Polygon (Chain ID: 137)
- `arbitrum` - Arbitrum (Chain ID: 42161)
- `optimism` - Optimism (Chain ID: 10)

### Examples

```bash
# Bridge 10 USDC from Ethereum to Base and deposit
tsx scripts/bridge-and-deposit.ts ethereum

# Bridge 50 USDC from Polygon to Base and deposit
AMOUNT_USDC=50 tsx scripts/bridge-and-deposit.ts polygon
```

## How It Works

1. The script uses LI.FI SDK to get a quote for bridging USDC from the source chain to Base Mainnet
2. It prepares a contract call to `depositERC20` on the `YieldOrchestrator` contract
3. LI.FI bundles the bridge + contract call into a single transaction
4. After execution, the bridged USDC is automatically deposited into the vault

## Notes

- Make sure your wallet has sufficient USDC on the source chain
- Make sure your wallet has enough native tokens (ETH, MATIC, etc.) for gas on the source chain
- The script will prompt for confirmation before executing the transaction
- Cross-chain transactions may take a few minutes to complete
