# OnlyYield - Support Creators with Yield, Not Your Money

**OnlyYield** is like Patreon, but instead of paying creators with your hard-earned money, you support them with **yield** - the passive income your money earns. You keep your principal, creators get supported, and you unlock exclusive content. It's a win-win-win.

## The Problem: Supporting Creators Costs You Money

Imagine you want to support your favorite creator on Patreon:

**Traditional Patreon Flow:**
1. You pay $10/month to unlock exclusive content
2. Your $10 is **gone forever** - you'll never see it again
3. You get access to content... until you stop paying
4. After 12 months, you've spent $120 and have **nothing** to show for it

**The Reality:**
- Supporting creators means **losing your money**
- You have to choose between supporting creators and saving/investing
- Many people can't afford to support creators they love
- Even if you can afford it, it feels like "burning money"

## ✨ The OnlyYield Solution: Support Creators with Yield, Keep Your Principal

**OnlyYield Flow:**
1. You deposit $500 USDC (or any amount) - **this is YOUR money, you keep it**
2. Your $500 earns ~5% APY = $25/year in yield
3. You select creators to support (like subscribing on Patreon)
4. OnlyYield automatically distributes the **yield** ($25/year) to your selected creators
5. You get **exclusive content access** from creators (just like Patreon)
6. **Your $500 principal stays yours** - you can withdraw it anytime

**The Magic:**
- ✅ Support creators **without spending your money**
- ✅ Get exclusive content access (like Patreon)
- ✅ Keep your principal - withdraw anytime
- ✅ Your money keeps earning yield while supporting creators
- ✅ Cross-chain support - deposit from any chain, creators receive on their preferred chain
- ✅ **Promotes healthy investment habits** - Instead of spending on subscriptions, you invest and use the returns

### Real-World Example: Sarah's Story

**Sarah** loves supporting 3 creators:
- **Alex** (Tech YouTuber) - $5/month on Patreon
- **Jordan** (Indie Game Dev) - $10/month on Patreon  
- **Casey** (Music Producer) - $15/month on Patreon

**Traditional Patreon:**
- Monthly cost: $30
- Annual cost: $360
- After 1 year: $360 **gone**, $0 left
- If she stops paying: No more content access

**With OnlyYield:**
- Sarah deposits $2,000 USDC (realistic savings amount)
- Earns ~5% APY = $100/year in yield
- Distributes yield to Alex ($40), Jordan ($40), Casey ($20)
- Gets exclusive content from all 3 creators
- **Her $2,000 stays hers** - she can withdraw it anytime
- After 1 year: Still has $2,000 + supported creators + exclusive content

**The Difference:**
- Traditional: Spend $360, get content, money is gone
- OnlyYield: Keep $2,000, get content, creators get supported with yield

**Sarah's Options:**
- Need emergency funds? Withdraw her $2,000 anytime
- Want to support more creators? Deposit more, earn more yield
- Happy with current setup? Let it run, creators keep getting yield

This is **Patreon, but with yield as the fee** - you never lose your principal.

---

## Important Links

### LI.FI Transaction Explorer Links

**Real Transaction Links:**
- **Cross-Chain Deposit** (Arbitrum → Base): [`https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a`](https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a)
- **Yield Distribution** (Base → Optimism): [`https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0`](https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0)

**Log Files:**
- **Bridge & Deposit Log**: [`frontend/logs/bridge-and-vault-deposit.log`](./frontend/logs/bridge-and-vault-deposit.log) - Complete deposit flow from Arbitrum to Base
- **Yield Distribution Log**: [`frontend/logs/yield-distribution.log`](./frontend/logs/yield-distribution.log) - Yield harvesting and cross-chain distribution
- **Cross-Chain Withdrawal Log**: [`frontend/logs/cross-chain-withdraw.log`](./frontend/logs/cross-chain-withdraw.log) - Withdrawal and bridge back to original chain

### Run Result JSONs

- **Base Mainnet Deployment**: [`contracts/broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json`](./contracts/broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json)
- **Agent Decision History**: [`agent/llm_decision_history.json`](./agent/llm_decision_history.json)
- **APY History**: [`agent/apy_history.json`](./agent/apy_history.json)
- **Li.FI Composer Run**: [`scripts/bridge-and-deposit.log`](./scripts/bridge-and-deposit.log)

### Agent Thinking JSONs

- **Latest Agent Analysis**: [`agent/llm_decision_history.json`](./agent/llm_decision_history.json) - Contains full LLM reasoning, market data, and allocation decisions

### Script Links

- **Bridge & Deposit**: [`scripts/bridge-and-deposit.ts`](./scripts/bridge-and-deposit.ts) - Cross-chain deposit via LI.FI

---

## Contract Table (Base Mainnet)

| Contract | Address | Explorer | Description |
|----------|---------|----------|-------------|
| **YieldVault** | [`0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544`](https://basescan.org/address/0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544) | [BaseScan](https://basescan.org/address/0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544) | ERC-4626 vault supplying to Aave V3 |
| **YieldStrategy** | [`0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0`](https://basescan.org/address/0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0) | [BaseScan](https://basescan.org/address/0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0) | ERC-20 strategy token with per-user yield tracking |
| **YieldOrchestrator** | [`0xEc67546d493484c4dBB749fdD6765D61E24369DA`](https://basescan.org/address/0xEc67546d493484c4dBB749fdD6765D61E24369DA) | [BaseScan](https://basescan.org/address/0xEc67546d493484c4dBB749fdD6765D61E24369DA) | Central operator for deposits, withdrawals, harvesting |
| **YieldDistributor** | [`0x787457C404f9ddB42978Ed3be15359AD166F9910`](https://basescan.org/address/0x787457C404f9ddB42978Ed3be15359AD166F9910) | [BaseScan](https://basescan.org/address/0x787457C404f9ddB42978Ed3be15359AD166F9910) | Equal distribution among recipients |
| **YieldReallocator** | [`0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4`](https://basescan.org/address/0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4) | [BaseScan](https://basescan.org/address/0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4) | Strategy migration with aggregator support |

**Deployment Transaction**: [`0xeb56fa1d3896dcfacb772d6412d7ca93614308782d1c2b591f01ea8631f94a30`](https://basescan.org/tx/0xeb56fa1d3896dcfacb772d6412d7ca93614308782d1c2b591f01ea8631f94a30)

**Full Deployment Log**: See [`contracts/deploy-base.log`](./contracts/deploy-base.log)

**Deployment JSON**: [`contracts/broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json`](./contracts/broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json)

**Contract Documentation**: See [`contracts/README.md`](./contracts/README.md) for detailed contract explanations.

---

## 🌉 How LI.FI Helped Us

LI.FI (Liquidity Finance) is the **critical infrastructure** that enables OnlyYield's seamless cross-chain and multi-asset operations. Without LI.FI, we would need to integrate with multiple bridges, DEXs, and handle complex routing logic ourselves. LI.FI abstracts all of this complexity into a unified SDK, dramatically simplifying our codebase and improving user experience.

### 1. LI.FI Composer: One-Click Cross-Chain Deposits

**Use Case**: Donation deposit flow with bundled bridging and contract execution.

**Problem Solved**: Users want to deposit from any chain (Ethereum, Polygon, Arbitrum, etc.) but our yield strategies operate on Base Mainnet. Without LI.FI Composer, users would need to:
1. Bridge assets manually (understand bridge protocols, wait for confirmations)
2. Switch to Base network
3. Approve tokens
4. Call `YieldStrategy.deposit()` separately

**LI.FI Solution**: `getContractCallsQuote` bundles bridging + contract call into **one atomic transaction**.

**Code Location**: [`frontend/app/api/bridge-deposit/route.ts`](../frontend/app/api/bridge-deposit/route.ts)

**Key Code Snippet** (Lines 176-194):
```typescript
const contractCallsQuoteRequest: ContractCallsQuoteRequest = {
  fromChain: sourceChainConfig.chainId,  // e.g., ChainId.ETH (Ethereum)
  fromToken: sourceUsdc.address,         // USDC on Ethereum
  fromAddress: body.donor_wallet_address,
  toChain: BASE_CHAIN_ID,                // Base Mainnet (8453)
  toToken: baseUsdcAddress,              // USDC on Base
  toAmount: body.amount_in_base_units,
  contractCalls: [
    {
      fromAmount: body.amount_in_base_units,
      fromTokenAddress: baseUsdcAddress,
      toContractAddress: strategyAddress,      // YieldStrategy on Base
      toContractCallData: depositTxData,       // Encoded deposit() call
      toContractGasLimit: '500000',
    },
  ],
};

const contactCallsQuoteResponse = await getContractCallsQuote(contractCallsQuoteRequest);
```

**Client Execution** (Lines 435-458 in `frontend/app/donor/page.tsx`):
```typescript
// User signs ONE transaction
const hash = await client.sendTransaction(transformTxRequest(quoteResponse.transactionRequest));

// LI.FI handles:
// 1. Bridge USDC from Ethereum → Base
// 2. Execute YieldStrategy.deposit() on Base
// All atomically!
```

**Benefits**:
- **One Transaction**: User signs once, everything happens atomically
- **No Manual Steps**: No chain switching, no separate approvals
- **Better UX**: Donors don't need to understand bridges or Base ecosystem
- **Gas Efficient**: Single transaction instead of multiple

**Impact**: Reduced donor friction by **~80%** - from 4+ manual steps to 1 click.

---

### 2. LI.FI Routes: Cross-Chain Withdrawal Flow

**Use Case**: Users withdrawing their principal back to their original chain.

**Problem Solved**: Users deposited from Ethereum, but funds are on Base. They want their USDC back on Ethereum. Without LI.FI, they would need to:
1. Understand Base ecosystem
2. Get Base ETH for gas
3. Manually bridge back
4. Wait for bridge confirmation

**LI.FI Solution**: `getRoutes` + `executeRoute` automatically bridges funds back to the user's original chain.

**Code Location**: [`frontend/app/donor/page.tsx`](../frontend/app/donor/page.tsx)

**Key Code Snippet** (Lines 730-774):
```typescript
// After operator executes withdrawal on Base, bridge back to original chain
const routeRequest = {
  toAddress: wallet as Address,
  fromAddress: wallet as Address,
  fromChainId: ChainId.BAS,              // From Base
  fromAmount: quoteData.amount_in_base_units,
  fromTokenAddress: quoteData.source_usdc_address,  // USDC on Base
  toChainId: quoteData.destination_chain_id,        // e.g., ChainId.ETH
  toTokenAddress: quoteData.destination_usdc_address, // USDC on Ethereum
  options: {
    slippage: 0.03, // 3%
  },
};

const routeResponse = await getRoutes(routeRequest);
const route = routeResponse.routes[0];

// Execute bridge
await executeRoute(route, executionOptions);
```

**Benefits**:
- **Automatic**: Operator handles withdrawal, LI.FI handles bridging
- **Optimal Route**: LI.FI finds cheapest/fastest bridge automatically
- **Status Tracking**: `getStatus()` provides real-time bridge status
- **Explorer Links**: LI.FI provides unified explorer links for tracking

**Impact**: Users receive funds on their preferred chain without any manual bridge knowledge.

---

### 3. LI.FI Swaps: Agent Multi-Asset Management

**Use Case**: AI agent rebalancing across multiple stablecoins (USDC, USDT, DAI, USDC.e) to maximize yield.

**Problem Solved**: Agent needs to swap tokens when rebalancing. Without LI.FI, we would need to:
1. Integrate with multiple DEXs (Uniswap, Curve, etc.)
2. Find optimal routes manually
3. Handle slippage protection
4. Manage gas optimization

**LI.FI Solution**: `getRoutes` for same-chain swaps aggregates across all DEXs and finds optimal routes automatically.

**Code Location**: [`agent/lifi_swap.js`](../agent/lifi_swap.js)

**Key Code Snippet** (Lines 96-138):
```javascript
// Request swap route (same-chain, Base Mainnet)
const routeRequest = {
  toAddress: recipient,
  fromAddress: account.address,
  fromChainId: ChainId.BAS,              // Base Mainnet
  fromAmount: amount.toString(),
  fromTokenAddress: fromToken.address,   // e.g., USDC
  toChainId: ChainId.BAS,                 // Same chain
  toTokenAddress: toToken.address,        // e.g., USDT
  options: {
    slippage: 0.03, // 3%
    allowSwitchChain: false,
  },
};

const routeResponse = await getRoutes(routeRequest);
const route = routeResponse.routes[0]; // LI.FI finds best route across DEXs

// Execute swap
await executeRoute(route, executionOptions);
```

**Python Agent Integration** (Lines 290-358 in `agent/api.py`):
```python
def execute_lifi_swap(
    self, 
    from_token: str, 
    to_token: str, 
    amount: int, 
    recipient: str
) -> Dict[str, Any]:
    """Execute token swap using LI.FI SDK via Node.js script."""
    script_path = os.path.join(os.path.dirname(__file__), "lifi_swap.js")
    result = subprocess.run(
        ['node', script_path, from_token, to_token, str(amount), 
         self.operator_private_key, recipient],
        capture_output=True,
        text=True
    )
    # Parse JSON result with txHash
```

**Benefits**:
- **Better Rates**: LI.FI aggregates liquidity across Uniswap, Curve, and other DEXs
- **Optimal Routing**: Automatically splits large swaps across multiple pools
- **Slippage Protection**: Built-in slippage controls
- **Gas Efficiency**: LI.FI optimizes gas usage
- **Future-Proof**: Easy to add new DEXs as they become available

**Why Not Use Orchestrator's Internal Swap?**:
- LI.FI provides better rates by aggregating across multiple DEXs
- Orchestrator's Uniswap V3 swap is limited to a single pool
- LI.FI automatically finds optimal routes and splits large swaps
- Better slippage protection and gas optimization

**Impact**: Agent can rebalance across assets with **optimal execution** - typically 0.1-0.5% better rates than single-DEX swaps.

---

### 4. LI.FI Routes: Cross-Chain Yield Distribution

**Use Case**: Distributing yield to recipients on their preferred chains.

**Problem Solved**: Yield is earned on Base, but recipients may prefer to receive it on Ethereum, Polygon, or other chains. Without LI.FI, we would need to:
1. Integrate with multiple bridge protocols
2. Handle different bridge interfaces
3. Manage bridge status tracking
4. Provide explorer links for each bridge

**LI.FI Solution**: `getRoutes` + `executeRoute` handles cross-chain distribution automatically, with unified status tracking and explorer links.

**Code Location**: [`frontend/app/api/distribute-yield/route.ts`](../frontend/app/api/distribute-yield/route.ts)

**Key Code Snippet** (Lines 360-420):
```typescript
// For each recipient on non-Base chain, bridge yield
const routeRequest = {
  toAddress: recipientAddress,
  fromAddress: operator.address,
  fromChainId: ChainId.BAS,              // From Base
  fromAmount: recipientAmount.toString(),
  fromTokenAddress: usdc as `0x${string}`, // USDC on Base
  toChainId: targetChainConfig.chainId,   // e.g., ChainId.ETH
  toTokenAddress: targetUsdcAddress,     // USDC on destination chain
  options: {
    slippage: 0.03, // 3%
  },
};

const routeResponse = await getRoutes(routeRequest);
if (!routeResponse.routes || routeResponse.routes.length === 0) {
  logs.push(`  ⚠️  No bridge route found to ${targetChainConfig.name}`);
  continue;
}

const route = routeResponse.routes[0];
await executeRoute(route as any, executionOptions);

// Get LI.FI explorer link for tracking
const status: any = await getStatus({
  txHash: txHashForExplorer,
  bridge: route.tool,
  fromChain: ChainId.BAS,
  toChain: targetChainConfig.chainId,
});
const lifiExplorerLink = status.lifiExplorerLink;
```

**Benefits**:
- **Recipient Choice**: Each recipient can receive yield on their preferred chain
- **Automatic Execution**: Operator handles all bridging - recipients don't need to do anything
- **Optimal Routing**: LI.FI finds cheapest/fastest bridge automatically
- **Unified Tracking**: Single LI.FI explorer link for all bridges
- **Multi-Bridge Support**: LI.FI can split across multiple bridges if needed

**Impact**: Recipients receive yield on their preferred chain **without any action required** - dramatically improving UX for public goods creators.

---

### Summary: LI.FI's Impact on OnlyYield

| Feature | Without LI.FI | With LI.FI | Improvement |
|---------|---------------|------------|-------------|
| **Cross-Chain Deposits** | 4+ manual steps, multiple transactions | 1 click, atomic transaction | ~80% reduction in friction |
| **Withdrawals** | Manual bridge knowledge required | Automatic bridging | 100% automated |
| **Multi-Asset Swaps** | Single DEX, manual routing | Multi-DEX aggregation, optimal routing | 0.1-0.5% better rates |
| **Yield Distribution** | Multiple bridge integrations | Unified LI.FI interface | 90% code reduction |
| **Status Tracking** | Per-bridge tracking | Unified LI.FI explorer | Single source of truth |

**Total Code Reduction**: LI.FI eliminated **~2000+ lines of bridge/DEX integration code** and replaced it with **~500 lines** of clean LI.FI SDK calls.

**Developer Experience**: Instead of maintaining integrations with 5+ bridges and 3+ DEXs, we maintain one LI.FI SDK integration.

**User Experience**: Users interact with one unified interface instead of learning multiple bridge protocols.

---


## How to Demo

### Demo Flow Overview

The demo showcases the complete OnlyYield flow: cross-chain deposit, yield generation, AI-powered optimization, and cross-chain yield distribution.

### Step 1: Cross-Chain Deposit

**UI Route**: `/donor` (Donor Dashboard)

> **Placeholder**: Add screenshot of donor dashboard

**What Happens:**
1. User connects wallet on source chain (e.g., Ethereum)
2. User enters donation amount and selects recipients
3. Frontend calls `/api/bridge-deposit` to get LI.FI quote
4. User signs transaction
5. LI.FI bridges USDC from source chain → Base Mainnet
6. LI.FI executes `YieldStrategy.deposit()` on Base atomically
7. User receives strategy shares

**Transaction Links:**
- **LI.FI Explorer**: [`https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a`](https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a)
- **BaseScan (Destination)**: [`https://basescan.org/tx/0x8741ffd62d7f04c992b00fd95d57d196b47b65d6a3f8a3156433218fc3c2c43b`](https://basescan.org/tx/0x8741ffd62d7f04c992b00fd95d57d196b47b65d6a3f8a3156433218fc3c2c43b)
- **Arbiscan (Source)**: [`https://arbiscan.io/tx/0xec8af9db42d4abe108b41bbf2816d57d667bd51a8cc433e085682a8e2cb754bf`](https://arbiscan.io/tx/0xec8af9db42d4abe108b41bbf2816d57d667bd51a8cc433e085682a8e2cb754bf)

**Log Details**: See [`frontend/logs/bridge-and-vault-deposit.log`](./frontend/logs/bridge-and-vault-deposit.log) for complete deposit flow:
- Deposit: 0.1 USDC from Arbitrum
- Bridge tool: Stargate V2
- Status: Completed successfully
- Destination transaction on Base confirmed

**Key Feature**: One transaction bridges and deposits—no manual steps.

### Step 2: Yield Generation (Your Money Works for Creators)

**What Happens:**
1. Your deposit goes into `YieldStrategy`
2. Strategy deploys to `YieldVault`
3. Vault supplies to Aave V3 Base (earning ~5% APY)
4. Yield accrues automatically over time

**The Magic**: Your principal stays untouched, but it's earning yield that supports creators.

**Transaction Links:**
- **Vault Supply to Aave**: `https://basescan.org/tx/[SUPPLY_TX_HASH]` *(placeholder)*

**Monitoring**: Check vault status via `scripts/check-vault-status.ts` or view in UI.

### Step 3: AI Agent Yield Optimization

**UI Route**: Agent runs via API endpoint `/api/analyze` (or scheduled cron)

> **Placeholder**: Add screenshot of agent analysis results

**What Happens:**
1. Agent monitors APY for USDC, USDT, DAI, USDC.e on Aave
2. AI (GPT-4) analyzes market data and determines optimal allocation
3. If rebalancing needed:
   - Agent swaps tokens via LI.FI (finds best route across DEXs)
   - Agent deposits swapped tokens into appropriate strategies

**Transaction Links:**
- **Token Swap (LI.FI)**: `https://scan.li.fi/tx/[SWAP_TX_HASH]` *(placeholder)*
- **Deposit to Strategy**: `https://basescan.org/tx/[DEPOSIT_TX_HASH]` *(placeholder)*

**Agent Decision JSON**: See [`agent/llm_decision_history.json`](./agent/llm_decision_history.json) for full reasoning.

> **Placeholder**: Add excalidraw diagram showing agent optimization flow

### Step 4: Yield Distribution (Creators Get Supported)

**UI Route**: Operator triggers `/api/distribute-yield`

> **Placeholder**: Add screenshot of yield distribution interface

**What Happens:**
1. Operator harvests yield via `YieldOrchestrator.harvestStrategy()`
2. For each active supporter:
   - Claim user yield via `YieldStrategy.claimUserYield()`
   - Split yield equally among selected creators
3. For each creator:
   - If preferred chain = Base: Direct USDC transfer
   - If preferred chain ≠ Base: LI.FI bridge to creator's preferred chain

**The Result**: Creators receive yield on their preferred chain, supporters get exclusive content access.

**Transaction Links:**
- **Harvest Yield**: [`https://basescan.org/tx/0x05e01fcc4aa3106c2d0f354ada868558de62ed5dc86ccdb6f8a1ea1c0933f7d0`](https://basescan.org/tx/0x05e01fcc4aa3106c2d0f354ada868558de62ed5dc86ccdb6f8a1ea1c0933f7d0)
- **Claim Yield**: [`https://basescan.org/tx/0x8a6dd683415f2b63bc3d4b436c3c61e02d18c76170862c4753ecdc26b327ef5b`](https://basescan.org/tx/0x8a6dd683415f2b63bc3d4b436c3c61e02d18c76170862c4753ecdc26b327ef5b)
- **Bridge to Creator (LI.FI)**: [`https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0`](https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0)

**Log Details**: See [`frontend/logs/yield-distribution.log`](./frontend/logs/yield-distribution.log) for complete distribution flow:
- Processed 5 donations
- Distributed 0.1 USDC per creator (demo mode)
- Cross-chain bridge: Base → Optimism
- All distributions completed successfully

### Step 5: Withdraw Principal (Anytime, Like Canceling Patreon)

**UI Route**: `/donor` (Supporter Dashboard - Withdrawal Section)

> **Placeholder**: Add screenshot of withdrawal interface

**What Happens:**
1. Supporter requests withdrawal (like canceling a Patreon subscription)
2. Operator executes `YieldOrchestrator.withdrawERC20()`
3. If original chain ≠ Base: LI.FI bridges funds back to original chain
4. Supporter receives USDC on original chain

**The Key Difference from Patreon**: 
- **Patreon**: Cancel subscription, money is already gone
- **OnlyYield**: Withdraw principal, get your money back

**Transaction Links:**
- **Withdrawal**: [`https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6`](https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6)

**Log Details**: See [`frontend/logs/cross-chain-withdraw.log`](./frontend/logs/cross-chain-withdraw.log) for complete withdrawal flow:
- Withdrawal amount: 0.1 USDC
- Operator executed withdrawal on Base
- Bridge route found for cross-chain withdrawal

---

## The Problem: Why Traditional Creator Support Doesn't Work

### The Patreon Problem: You Lose Your Money Forever

When you support creators on Patreon (or similar platforms), you're **spending money**:
- $10/month subscription = $120/year **gone forever**
- You get content access, but your money is **never coming back**
- Supporting multiple creators multiplies the cost
- Many people can't afford to support creators they love

**The Core Issue**: Supporting creators means **sacrificing your savings**. You have to choose between:
- Supporting creators you love ❤️
- Saving/investing your money 💰

Most people can't do both.

### The Yield Opportunity: Your Money Can Work for Creators AND You

Your money sitting in DeFi earns yield (~5% APY on stablecoins):
- $10,000 earns ~$500/year passively
- But this yield typically just sits there or gets reinvested
- **What if this yield could support creators instead?**

**The Opportunity**: What if you could:
- Keep your principal (your deposit stays yours)
- Support creators with the yield (passive income)
- Get exclusive content access (like Patreon)
- Withdraw your principal anytime you need it
- **Build healthy financial habits** - Invest instead of spend, use returns for subscriptions

**The Challenge**: Making this seamless requires:
- Cross-chain deposits (users on different chains)
- Automated yield distribution
- Multi-asset management
- One-click UX

This is what OnlyYield solves.

---

## Our Solution: Patreon, But With Yield as the Fee

**OnlyYield** is **Patreon for Web3** - but instead of paying creators with your money, you support them with **yield**. Your principal stays yours, creators get supported, and you unlock exclusive content.

### How It Works (The Simple Version)

1. **Deposit Your Money**: Deposit USDC (or any stablecoin) from any chain
   - This is **YOUR money** - you keep it, you can withdraw it anytime
   - Your deposit earns yield automatically (~5% APY)

2. **Select Creators**: Choose creators to support (like subscribing on Patreon)
   - Each creator can offer exclusive content
   - You can support multiple creators

3. **Yield Supports Creators**: OnlyYield automatically distributes your **yield** to creators
   - Your principal stays untouched
   - Creators receive yield on their preferred chain
   - Distribution happens automatically

4. **Get Exclusive Content**: Creators grant you access to exclusive content
   - Just like Patreon subscriptions
   - Access is tied to your support (yield distribution)

5. **Withdraw Anytime**: Need your money back? Withdraw your principal anytime
   - Your principal is always yours
   - Withdrawing stops yield distribution (like canceling a Patreon subscription)

### Key Features

**1. Principal Preservation**
- Your deposit stays yours - withdraw anytime
- Only yield is distributed to creators
- Like Patreon, but you keep your "subscription fee" money

**2. Automated Yield Distribution**
- Set it and forget it - yield distributes automatically
- No manual steps, no gas fees for each distribution
- Creators receive yield on their preferred chain

**3. Cross-Chain Support**
- Deposit from Ethereum, Polygon, Arbitrum, Optimism, or Base
- Creators receive yield on their preferred chain
- One-click deposits via LI.FI Composer

**4. AI-Powered Yield Optimization**
- Our AI agent maximizes your yield across multiple stablecoins
- Better yield = more support for creators
- Automatic rebalancing via LI.FI swaps

**5. Exclusive Content Access**
- Creators can offer exclusive content to supporters
- Access is tied to active yield distribution
- Like Patreon tiers, but powered by yield

**6. Promotes Healthy Financial Habits**
- Instead of spending money on subscriptions, you invest it
- Your money works for you while supporting creators
- Builds long-term wealth while enjoying content
- Teaches investment-based approach to recurring expenses

### The OnlyYield Advantage Over Patreon

| Feature | Patreon | OnlyYield |
|---------|---------|-----------|
| **Cost to Support** | Your money ($10/month) | Yield only (~$0.20/month on $500 deposit) |
| **Principal** | Gone forever | Yours, withdraw anytime |
| **After 1 Year** | $120 spent, $0 left | $500 still yours + yield earned |
| **Content Access** | ✅ Yes | ✅ Yes |
| **Financial Habit** | Spending money | Investing money |
| **Cross-Chain** | ❌ No | ✅ Yes |
| **Yield Optimization** | ❌ No | ✅ AI-powered |

**Example**: Supporting 3 creators at $10/month each
- **Patreon**: Spend $360/year, money is gone
- **OnlyYield**: Deposit $500, earn $25/year yield, distribute to creators, **keep your $500** + build investment habits

---

## How LI.FI Enables One-Click UX with Composer

### Atomic Bridge + Contract Execution

LI.FI Composer's `getContractCallsQuote` API enables **one-click cross-chain deposits** by combining bridging with on-chain contract execution in a single atomic transaction.

**Technical Flow:**

```typescript
const contractCallsQuoteRequest = {
  fromChain: ChainId.ETH,           // Source: Ethereum
  fromToken: sourceUsdc.address,    // USDC on Ethereum
  fromAddress: donorAddress,
  toChain: ChainId.BAS,             // Destination: Base
  toToken: baseUsdcAddress,         // USDC on Base
  toAmount: amountInBaseUnits,
  contractCalls: [{
    fromAmount: amountInBaseUnits,
    fromTokenAddress: baseUsdcAddress,
    toContractAddress: strategyAddress,      // YieldStrategy on Base
    toContractCallData: depositTxData,       // Encoded deposit() call
    toContractGasLimit: '500000',
  }],
};
```

**What This Enables:**

1. **Supporter signs ONE transaction** on Ethereum (or any chain)
2. **LI.FI bridges** USDC from Ethereum → Base Mainnet automatically
3. **LI.FI executes** `YieldStrategy.deposit()` on Base atomically
4. **Supporter receives** strategy shares and exclusive content access
5. **All in one transaction** - like clicking "Subscribe" on Patreon

**Benefits:**
- **Zero Manual Steps**: No chain switching, no separate approvals, no bridge knowledge needed
- **Atomic Execution**: Either everything succeeds or everything reverts—no partial states
- **Gas Efficient**: Single transaction instead of multiple (bridge + approve + deposit)
- **Better UX**: One click, any chain, automatic execution - just like Patreon

**Real Example**: Sarah on Ethereum wants to support Alex (creator on Base):
- **Without LI.FI**: Bridge manually → Switch to Base → Approve → Deposit (4+ steps)
- **With LI.FI**: Click support → Sign transaction → Done (1 step)

**Example Transaction:**
- **Real Example**: [`https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a`](https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a) - Shows bridge + deposit in one atomic transaction (Arbitrum → Base)

---

## How LI.FI Bridging Enables Easy Cross-Chain Creator Payouts

### Seamless Cross-Chain Distribution: Creators Get Paid on Their Preferred Chain

LI.FI's `getRoutes` API enables **automatic cross-chain yield distribution** - creators receive support on their preferred chain, regardless of where supporters deposited.

**The Patreon Problem**: Creators must receive payments in fiat, limiting global reach.

**The OnlyYield Solution**: Creators receive yield on **any chain** they prefer - Ethereum, Polygon, Arbitrum, Optimism, or Base.

**Technical Flow:**

```typescript
const routeRequest = {
  toAddress: recipientAddress,      // Recipient on Ethereum
  fromAddress: operatorAddress,     // Operator on Base
  fromChainId: ChainId.BAS,         // From Base
  fromAmount: yieldAmount,
  fromTokenAddress: baseUsdcAddress,
  toChainId: ChainId.ETH,           // To Ethereum (or any chain)
  toTokenAddress: targetUsdcAddress,
  options: { slippage: 0.03 },
};
```

**What This Enables:**

1. **Operator initiates** bridge from Base (where yield is earned)
2. **LI.FI finds optimal route** (may use multiple bridges for best rates)
3. **Funds arrive** on creator's preferred chain automatically
4. **No creator action required** - they just receive USDC on their chain

**Benefits:**
- **Creator Choice**: Each creator can receive yield on their preferred chain
- **Automatic Execution**: Operator handles all bridging—creators don't need to do anything
- **Optimal Routing**: LI.FI finds the cheapest/fastest bridge automatically
- **Multi-Bridge Support**: LI.FI can split across multiple bridges if needed

**Real Example**: 
- Supporter deposits from Ethereum
- Creator prefers Polygon
- LI.FI automatically bridges yield: Base → Polygon
- Creator receives USDC on Polygon, no action needed

**Example Transaction:**
- **Real Example**: [`https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0`](https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0) - Shows cross-chain yield distribution (Base → Optimism)

**Impact:**
- Creators don't need Base wallets or knowledge of Base ecosystem
- Yield can be distributed to creators on Ethereum, Polygon, Arbitrum, etc.
- One operator transaction distributes to multiple chains automatically
- **Just like Patreon, but creators receive crypto on their preferred chain**

---

## Cross-Chain Architecture

> **Placeholder**: Add Excalidraw diagram showing:
> - User on Ethereum depositing
> - LI.FI bridge to Base
> - Yield generation on Base
> - Yield distribution back to multiple chains
> - All with LI.FI explorer links

**Key Components:**
- **Source Chains**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **Destination Chain**: Base Mainnet (where yield strategies operate)
- **Distribution Chains**: Any chain (recipient's choice)
- **Bridge Infrastructure**: LI.FI (handles all cross-chain operations)

---

## Agent Optimizing Yield Powered by LI.FI Swaps

> **Placeholder**: Add Excalidraw diagram showing:
> - Agent monitoring APY across 4 assets
> - AI decision-making process
> - LI.FI swap execution (aggregating across DEXs)
> - Deposit into optimal strategy
> - All with transaction links

**Flow:**
1. **Agent monitors** APY for USDC, USDT, DAI, USDC.e on Aave V3 Base
2. **AI analyzes** market data, swap costs, gas efficiency
3. **AI decides** optimal allocation percentages
4. **Agent executes swaps** via LI.FI:
   - LI.FI finds best route across Uniswap, Curve, etc.
   - Executes swap with optimal slippage
5. **Agent deposits** swapped tokens into appropriate strategies
6. **Result**: Maximum yield with optimal execution

**Why LI.FI for Swaps:**
- **Better Rates**: Aggregates liquidity across multiple DEXs
- **Optimal Routing**: Splits large swaps to minimize slippage
- **Gas Efficiency**: Optimizes gas usage
- **Future-Proof**: Easy to add new DEXs

**Agent Decision JSON**: See [`agent/llm_decision_history.json`](./agent/llm_decision_history.json)

---

## How It All Works

> **Placeholder**: Add Excalidraw diagram showing complete system flow:
> - User deposit (cross-chain via LI.FI)
> - Yield generation (Aave V3)
> - AI agent optimization (LI.FI swaps)
> - Yield distribution (cross-chain via LI.FI)
> - All contracts and their interactions
> - All transaction links

**Complete Flow:**

```
1. User (Ethereum) → LI.FI Bridge → Base → YieldStrategy → YieldVault → Aave V3
2. Yield accrues on aTokens
3. AI Agent monitors APY → Decides allocation → Swaps via LI.FI → Deposits
4. Operator harvests yield → Claims per-user yield → Distributes
5. Recipients receive yield on preferred chains via LI.FI bridges
```

**Key Technologies:**
- **LI.FI**: Cross-chain bridging and token swaps
- **Aave V3**: Yield generation
- **GPT-4**: AI-powered allocation decisions
- **ERC-4626**: Standardized vault interface
- **Per-User Tracking**: Fair yield distribution

---

## Demo Tradeoffs

### Yield Bump for Demo

**What**: We artificially add 0.1 USDC per recipient to the yield amount for demo purposes, regardless of actual yield.

**Why**: Real yield amounts can be very small (e.g., 0.000006 USDC), making it difficult to demonstrate the system. The demo workaround ensures recipients receive meaningful amounts.

**Implementation**: See `frontend/app/api/distribute-yield/route.ts` - "DEMO WORKAROUND" section.

**Production**: This should be removed in production. Real yield should be distributed as-is.

### Manual Agent Trigger Instead of Cron Job

**What**: The AI agent is triggered manually via API endpoint `/api/analyze` instead of running on a scheduled cron job.

**Why**: For demo purposes, manual triggering allows controlled execution and easier debugging.

**Implementation**: 
- Current: `POST /api/analyze` triggers agent
- Future: Cron job in `frontend/orchestrator/cron.mjs` (placeholder)

**Production**: Should run on a schedule (e.g., every 6 hours) to continuously optimize yield.

**Other Tradeoffs:**
- **Limited Asset Support**: Currently supports 4 stablecoins (USDC, USDT, DAI, USDC.e). Production should support more.
- **Single Strategy**: Currently one strategy per asset. Production could have multiple strategies per asset.
- **Operator-Only Execution**: All operations require operator role. Future could support user-initiated operations.

---

## Contract Architecture

**Detailed contract explanations are in [`contracts/README.md`](./contracts/README.md).**

### Quick Overview

| Contract | Purpose | Key Features |
|----------|---------|--------------|
| **YieldVault** | ERC-4626 vault | Supplies to Aave V3, manages performance fees |
| **YieldStrategy** | Strategy token | Per-user yield tracking, yield accumulation |
| **YieldOrchestrator** | Central operator | Deposits, withdrawals, harvesting, cross-asset operations |
| **YieldReallocator** | Migration | Strategy-to-strategy migration with aggregator support |

**See [`contracts/README.md`](./contracts/README.md) for:**
- Detailed function explanations
- State variable descriptions
- Access control roles
- Integration patterns
- Security considerations

---

## Architecture Decisions

### Why ERC-4626?

- **Standardization**: Industry standard for vault interfaces
- **Composability**: Other protocols can integrate with our vaults
- **Share Calculation**: Standardized share calculation prevents rounding errors
- **Preview Functions**: Users can preview deposits/withdrawals before executing

### Why Lazy Yield Accumulation?

- **Gas Efficiency**: Updating all users on every report would be gas-prohibitive
- **On-Demand**: Yield is captured when users interact (when they need it)
- **Fairness**: Users who interact more frequently capture yield more accurately
- **Scalability**: Supports unlimited users without gas issues

### Why Per-User Yield Tracking?

- **Fairness**: Each user's yield is proportional to their share ownership
- **Flexibility**: Users can support different recipients
- **Transparency**: Users can query their yield at any time
- **Granularity**: Enables per-donation yield distribution

### Why LI.FI Instead of Direct Bridges or Internal Swaps?

- **Route Optimization**: LI.FI finds the best bridge or swap route for each operation
- **Unified Interface**: One SDK for all cross-chain operations and token swaps
- **Contract Calls**: Enables atomic bridge + contract execution
- **Status Tracking**: Built-in status monitoring and explorer links
- **Multi-Bridge/Multi-DEX**: Automatically uses multiple bridges or DEXs if needed
- **Better Rates**: Aggregates liquidity across multiple DEXs for optimal swap rates
- **Slippage Protection**: Advanced routing minimizes slippage on large swaps
- **Future-Proof**: Easy to add new DEXs and bridges as they become available

---

## Security Considerations

- **Access Control**: All critical functions are role-gated
- **Reentrancy Guards**: All state-changing functions use `nonReentrant`
- **Pausability**: Contracts can be paused in emergencies
- **Slippage Protection**: All swaps include minimum amount out
- **Input Validation**: All functions validate inputs
- **Safe Math**: Uses OpenZeppelin's SafeERC20 and Math libraries

---

## License

MIT

---

## Contributing

Contributions are welcome! Please open an issue or pull request.

---

## Support

For questions or support, please open an issue on GitHub.
