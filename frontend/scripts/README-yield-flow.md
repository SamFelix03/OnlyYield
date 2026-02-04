# Yield Flow Test Script

This script tests the complete yield distribution flow by:
1. Depositing USDC into the vault via orchestrator
2. Waiting 1 minute for yield to accrue
3. Harvesting yield (which automatically distributes to recipients)
4. Withdrawing remaining funds

## Prerequisites

- Node.js 18+ and npm/pnpm
- TypeScript and tsx installed
- Contracts deployed on Sepolia testnet
- USDC in the depositor wallet

## Installation

```bash
# Install dependencies if not already installed
pnpm install

# Install tsx if not already installed
pnpm add -D tsx
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Required: Depositor wallet private key
DEPOSITOR_PRIVATE_KEY=0x...

# Required: Contract addresses (from deployment)
YIELD_ORCHESTRATOR_ADDRESS=0x...
YIELD_STRATEGY_ADDRESS=0x...
YIELD_DISTRIBUTOR_ADDRESS=0x...

# Required: USDC token address on Sepolia
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Required: Three recipient addresses for yield distribution
RECIPIENT_1=0x...
RECIPIENT_2=0x...
RECIPIENT_3=0x...

# Optional: RPC URL (defaults to Infura)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key

# Optional: Deposit amount in USDC (defaults to 100)
DEPOSIT_AMOUNT_USDC=100
```

## Usage

```bash
# Make script executable (first time only)
chmod +x scripts/test-yield-flow.ts

# Run the script
pnpm tsx scripts/test-yield-flow.ts

# Or with npx
npx tsx scripts/test-yield-flow.ts
```

## What the Script Does

1. **Checks USDC Balance**: Verifies the depositor has sufficient USDC
2. **Approves Orchestrator**: Grants permission to spend USDC
3. **Deposits USDC**: Deposits via orchestrator into the strategy
4. **Waits 1 Minute**: Allows time for Aave to accrue yield
5. **Harvests Yield**: Calls `harvestStrategy()` which triggers `report()` and distributes yield to recipients
6. **Withdraws Funds**: Withdraws remaining funds from the strategy
7. **Shows Summary**: Displays final balances and yield distribution

## Expected Output

```
🚀 Starting Yield Flow Test Script

📋 Configuration:
   RPC URL: https://sepolia.infura.io/...
   Orchestrator: 0x...
   Strategy: 0x...
   ...

👤 Depositor Address: 0x...

📊 Step 1: Checking USDC Balance
   Balance: 1000.0 USDC

🔐 Step 2: Approving Orchestrator
   ✅ Approved

💰 Step 3: Depositing USDC via Orchestrator
   ✅ Deposited 100 USDC
   Strategy Shares: 100000000
   Strategy Total Assets: 100.0 USDC

⏱️  Step 4: Waiting 1 minute for yield to accrue...
   ✅ Wait complete

🌾 Step 5: Harvesting Yield (Distributing to Recipients)
   ✅ Harvested
   Profit: 0.001 USDC
   Loss: 0 USDC

   Recipient balances after harvest:
     0x...: 0.000333 USDC (+0.000333)
     0x...: 0.000333 USDC (+0.000333)
     0x...: 0.000334 USDC (+0.000334)

💸 Step 6: Withdrawing Remaining Funds
   ✅ Withdrawn 100.0 USDC
   Final USDC Balance: 1000.0 USDC

📊 Final Summary:
   Initial Deposit: 100 USDC
   Yield Generated: 0.001 USDC
   Yield Distributed: 0.000333 USDC per recipient

✅ Flow Complete!
```

## Notes

- The script uses the same patterns as the existing `lib/services` code
- Yield distribution happens automatically when `harvestStrategy()` is called
- The 1-minute wait is for demonstration; in production, yield accrues continuously
- Make sure the depositor wallet has the `OPERATOR_ROLE` in the strategy contract
- The script assumes USDC has 6 decimals (standard on Sepolia)
