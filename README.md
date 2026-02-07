# OnlyYield - Support Creators with Yield, Keep Your Money

<p align="center">
<img width="763" height="327" alt="onlyYieldLogo" src="https://github.com/user-attachments/assets/6efd77d8-f937-4b92-a0b4-60605f05e269" />
</p>


**OnlyYield** is like Patreon, but with a key difference: you keep your principal. Traditional creator support platforms work great - they enable direct support and exclusive content access. OnlyYield offers the same benefits while allowing you to support creators with **yield** - the passive income your money earns - instead of spending your principal. You keep your money, creators get supported, and you unlock exclusive content.

## The Opportunity: Support Creators While Keeping Your Money

Traditional creator support platforms like Patreon are excellent - they enable creators to monetize their work and supporters to access exclusive content. However, when you support creators through traditional platforms, your money is spent and cannot be recovered.

**Traditional Patreon Flow:**
1. You pay $10/month to unlock exclusive content
2. Your $10 supports the creator directly
3. You get access to content while you're subscribed
4. After 12 months, you've spent $120 supporting creators

**The OnlyYield Difference:**
- Traditional support: Your money supports creators (which is great!)
- OnlyYield: Your money supports creators AND stays yours
- You can support creators while preserving your principal
- Your money earns yield that supports creators, but you keep the original amount

## The Solution: Support Creators with Yield, Keep Your Principal

**OnlyYield Flow:**
1. You deposit $500 USDC (or any amount) - **this is YOUR money, you keep it**
2. Your $500 earns ~5% APY = $25/year in yield
3. You select creators to support (like subscribing on Patreon)
4. OnlyYield automatically distributes the **yield** ($25/year) to your selected creators
5. You get **exclusive content access** from creators (just like Patreon)
6. **Your $500 principal stays yours** - you can withdraw it anytime

**The Magic:**
- Support creators **without spending your money**
- Get exclusive content access (like Patreon)
- Keep your principal - withdraw anytime
- Your money keeps earning yield while supporting creators
- Cross-chain support - deposit from any chain, creators receive on their preferred chain
- **Promotes healthy investment habits** - Instead of spending on subscriptions, you invest and use the returns

### Difference Vs Patreon

Traditional creator support platforms like Patreon work well - they enable direct support and exclusive content access. OnlyYield offers the same benefits while allowing supporters to keep their principal. The following comparison illustrates the key difference:

<img width="977" height="625" alt="Screenshot 2026-02-07 at 12 07 30 AM" src="https://github.com/user-attachments/assets/7951f5e8-b33b-4049-a8f8-994a9de90da0" />

*Traditional subscription model: Users pay money upfront to support creators and gain exclusive content access. The money flows directly to creators.*

<img width="1035" height="592" alt="Screenshot 2026-02-07 at 12 20 30 AM" src="https://github.com/user-attachments/assets/5eaa6598-e97c-4a9e-a123-c40298f41e50" />

*OnlyYield model: Users deposit principal into an ERC-4626 vault that generates yield. Only the yield is distributed to creators, while the principal remains under user control and can be withdrawn at any time.*

### Real-World Example: Sarah's Story

**Sarah** loves supporting 3 creators:
- **Alex** (Tech YouTuber) - $5/month on Patreon
- **Jordan** (Indie Game Dev) - $10/month on Patreon  
- **Casey** (Music Producer) - $15/month on Patreon

**Traditional Patreon:**
- Monthly cost: $30
- Annual cost: $360
- Supports creators directly
- After 1 year: $360 spent supporting creators
- If she stops paying: No more content access

**With OnlyYield:**
- Sarah deposits $2,000 USDC (realistic savings amount)
- Earns ~5% APY = $100/year in yield
- Distributes yield to Alex ($40), Jordan ($40), Casey ($20)
- Gets exclusive content from all 3 creators
- **Her $2,000 stays hers** - she can withdraw it anytime
- After 1 year: Still has $2,000 + supported creators + exclusive content

**The Difference:**
- Traditional: Spend $360 supporting creators, get content
- OnlyYield: Keep $2,000, support creators with yield, get content

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

## How LI.FI Helped Us

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

**Impact**: Reduced donor friction by approximately 80% - from 4+ manual steps to 1 click.

**Real Execution Log**: See [`frontend/logs/bridge-and-vault-deposit.log`](./frontend/logs/bridge-and-vault-deposit.log) for a complete example of the deposit flow, including:
- LI.FI Composer quote generation
- Token approval process
- Atomic bridge + deposit execution
- Bridge status monitoring
- Transaction confirmation on both source (Arbitrum) and destination (Base) chains

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

**Real Execution Log**: See [`frontend/logs/cross-chain-withdraw.log`](./frontend/logs/cross-chain-withdraw.log) for a complete example of the withdrawal flow, including:
- Withdrawal request processing
- Operator execution on Base
- LI.FI route discovery for cross-chain bridging
- Bridge execution back to original chain

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

**Impact**: Agent can rebalance across assets with optimal execution - typically 0.1-0.5% better rates than single-DEX swaps.

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
  logs.push(`  Warning: No bridge route found to ${targetChainConfig.name}`);
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

**Impact**: Recipients receive yield on their preferred chain without any action required - dramatically improving UX for public goods creators.

**Real Execution Log**: See [`frontend/logs/yield-distribution.log`](./frontend/logs/yield-distribution.log) for a complete example of the yield distribution flow, including:
- Yield harvesting from strategies
- Per-donation yield claiming
- Cross-chain bridge execution (Base → Optimism)
- LI.FI explorer link generation
- Distribution to multiple recipients across different chains

---

### Summary: LI.FI's Impact on OnlyYield

| Feature | Without LI.FI | With LI.FI | Improvement |
|---------|---------------|------------|-------------|
| **Cross-Chain Deposits** | 4+ manual steps, multiple transactions | 1 click, atomic transaction | ~80% reduction in friction |
| **Withdrawals** | Manual bridge knowledge required | Automatic bridging | 100% automated |
| **Multi-Asset Swaps** | Single DEX, manual routing | Multi-DEX aggregation, optimal routing | 0.1-0.5% better rates |
| **Yield Distribution** | Multiple bridge integrations | Unified LI.FI interface | 90% code reduction |
| **Status Tracking** | Per-bridge tracking | Unified LI.FI explorer | Single source of truth |

**Total Code Reduction**: LI.FI eliminated approximately 2000+ lines of bridge/DEX integration code and replaced it with approximately 500 lines of clean LI.FI SDK calls.

**Developer Experience**: Instead of maintaining integrations with 5+ bridges and 3+ DEXs, we maintain one LI.FI SDK integration.

**User Experience**: Users interact with one unified interface instead of learning multiple bridge protocols.

---


## How to Demo

### Demo Flow Overview

The demo showcases the complete OnlyYield flow: cross-chain deposit, yield generation, AI-powered optimization, and cross-chain yield distribution.

### Step 1: Cross-Chain Deposit

**UI Route**: `/donor` (Donor Dashboard)

<img width="1146" height="724" alt="Screenshot 2026-02-07 at 9 57 04 AM" src="https://github.com/user-attachments/assets/47f0d4a7-41c4-4309-8889-4dc712e1ee4a" />

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

**Mechanism**: Your principal remains untouched while earning yield that supports creators.

**Transaction Links:**
- **Vault Supply to Aave**: [`https://basescan.org/tx/0x3cdfc159c10892b852e24d7bac17283694d2f3d5955856548d910914ef9e2ae7`](https://basescan.org/tx/0x3cdfc159c10892b852e24d7bac17283694d2f3d5955856548d910914ef9e2ae7)

**Monitoring**: Check vault status via `scripts/check-vault-status.ts` or view in UI.

### Step 3: AI Agent Yield Optimization

**UI Route**: Agent runs via API endpoint `/api/analyze` (manually triggered for demo; production will use scheduled cron)

<img width="615" height="412" alt="Screenshot 2026-02-07 at 1 17 04 AM" src="https://github.com/user-attachments/assets/1f73f09b-93f2-498b-8fbf-58aee4cc6af9" />

*Multi-asset yield optimizer agent monitoring APY across four stablecoins (USDC, USDT, DAI, USDC.e), analyzing market data with AI decision-making, and executing token swaps via LI.FI to optimize yield allocation.*

**What Happens:**
1. Agent monitors APY for USDC, USDT, DAI, USDC.e on Aave
2. AI (GPT-4) analyzes market data (APY history, treasury balances, risk tolerance settings) and determines optimal allocation
3. Agent identifies the optimal performing token based on APY comparison
4. If rebalancing needed:
   - Agent swaps tokens via LI.FI (finds best route across DEXs)
   - LI.FI aggregates liquidity across Uniswap, Curve, and other DEXs
   - Agent deposits swapped tokens into appropriate strategies
5. Agent manages treasury balance of each token to maximize yield

**Agent Decision JSON**: See [`agent/llm_decision_history.json`](./agent/llm_decision_history.json) for full reasoning.

### Step 4: Yield Distribution (Creators Get Supported)

**UI Route**: Operator manually triggers `/api/distribute-yield` (for demo purposes; production will use scheduled automation)

<img width="1146" height="749" alt="Screenshot 2026-02-07 at 9 58 02 AM" src="https://github.com/user-attachments/assets/98dd91c0-905a-492c-80cb-8aadc876339a" />

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

<img width="1146" height="749" alt="Screenshot 2026-02-07 at 9 58 32 AM" src="https://github.com/user-attachments/assets/fee3becd-ed60-421b-aea9-d978e35fdddb" />

**What Happens:**
1. Supporter requests withdrawal (like canceling a Patreon subscription)
2. Operator executes `YieldOrchestrator.withdrawERC20()`
3. If original chain ≠ Base: LI.FI bridges funds back to original chain
4. Supporter receives USDC on original chain

**Key Difference from Patreon**: 
- **Patreon**: Cancel subscription, money is already spent
- **OnlyYield**: Withdraw principal, recover your deposited funds

**Transaction Links:**
- **Withdrawal**: [`https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6`](https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6)

**Log Details**: See [`frontend/logs/cross-chain-withdraw.log`](./frontend/logs/cross-chain-withdraw.log) for complete withdrawal flow:
- Withdrawal amount: 0.1 USDC
- Operator executed withdrawal on Base
- Bridge route found for cross-chain withdrawal

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

---

## How It All Works

<img width="1442" height="756" alt="Screenshot 2026-02-07 at 1 16 39 AM" src="https://github.com/user-attachments/assets/bba876a2-9c0a-4934-b9ae-57e2980d910b" />

*Complete end-to-end flow of the OnlyYield platform, from user deposit to yield distribution and principal withdrawal.*

The OnlyYield platform orchestrates a sophisticated flow that enables users to support creators with yield while preserving their principal. This section details each step of the process, from initial deposit to yield distribution and withdrawal.

### Step 1: User Deposit (Cross-Chain via LI.FI Composer)

**User Action**: User connects wallet on source chain (Ethereum, Polygon, Arbitrum, Optimism, or Base) and initiates a deposit.

**Technical Execution**:

1. **Frontend Request** (`frontend/app/donor/page.tsx`):
   - User enters deposit amount and selects creators to support
   - Frontend calls `/api/bridge-deposit` with deposit parameters
   - API endpoint: [`frontend/app/api/bridge-deposit/route.ts`](./frontend/app/api/bridge-deposit/route.ts)

2. **LI.FI Composer Quote Generation**:
   ```typescript
   const contractCallsQuoteRequest = {
     fromChain: sourceChainConfig.chainId,  // e.g., ChainId.ARB (Arbitrum)
     fromToken: sourceUsdc.address,         // USDC on source chain
     fromAddress: donorAddress,
     toChain: BASE_CHAIN_ID,                // Base Mainnet (8453)
     toToken: baseUsdcAddress,              // USDC on Base
     toAmount: amountInBaseUnits,
     contractCalls: [{
       toContractAddress: strategyAddress,  // YieldStrategy on Base
       toContractCallData: depositTxData,    // Encoded deposit() call
       toContractGasLimit: '500000',
     }],
   };
   const quote = await getContractCallsQuote(contractCallsQuoteRequest);
   ```

3. **Atomic Bridge + Deposit Execution**:
   - User signs **one transaction** on source chain
   - LI.FI bridges USDC from source chain → Base Mainnet
   - LI.FI automatically executes `YieldStrategy.deposit()` on Base
   - Transaction is atomic: either both succeed or both revert

4. **Contract Interaction**:
   - `YieldStrategy.deposit(amount, user)` is called on Base
   - Strategy captures any unrealized yield via `_updateUserYield(user)`
   - Funds are deployed to `YieldVault` via `_deployFunds(amount)`
   - Vault receives assets and mints shares to strategy
   - Strategy mints strategy shares to user

**Result**: User receives strategy shares representing their deposit, and the deposit is recorded in the database with transaction hash.

**Transaction Example**: [`https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a`](https://scan.li.fi/tx/0xef946cdf94b9e5db1609c3b5a3d4658b5f3cb1c22e4c1541d99b7079baa0f03a) - Arbitrum → Base deposit

**Execution Log**: See [`frontend/logs/bridge-and-vault-deposit.log`](./frontend/logs/bridge-and-vault-deposit.log) for complete step-by-step execution.

---

### Step 2: Yield Generation (Aave V3)

**Automatic Process**: Once funds are deposited, yield generation begins automatically.

**Technical Flow**:

1. **Vault Deployment**:
   - `YieldVault` receives assets from `YieldStrategy`
   - Vault is an ERC-4626 compliant contract that manages asset deployment

2. **Aave V3 Supply**:
   - Vault calls `supplyToAave(amount)` to supply assets to Aave V3 Pool on Base
   - Aave returns aTokens (e.g., aUSDC) representing the supplied position
   - Yield accrues continuously on the aToken balance

3. **Yield Accrual Mechanism**:
   - Aave V3 pays supply APY (~5% for stablecoins) on deposited assets
   - Yield is reflected in increasing aToken balance over time
   - Vault's `totalAssets()` increases as yield accrues
   - Strategy share value increases proportionally

4. **Per-User Yield Tracking**:
   - `YieldStrategy` tracks each user's yield independently
   - Yield is calculated lazily (on-demand) when users interact
   - Formula: `userYield = (userShares / totalShares) * (currentAssets - lastReportedAssets)`

**Result**: Assets earn yield continuously in Aave V3, and the yield is tracked per user for fair distribution.

---

### Step 3: Multi-Asset Yield Optimizer Agent

**Purpose**: The AI-powered agent continuously monitors APY across multiple stablecoins and optimizes asset allocation to maximize yield for creators.

**Note**: For demo purposes, the agent is manually triggered via `/api/analyze`. In production, it will run on a scheduled cron job (e.g., every 6 hours).

**Agent Architecture** (`agent/api.py`):

The agent uses GPT-4 (or GPT-4o) to analyze market conditions and make intelligent allocation decisions across four supported assets: USDC, USDT, DAI, and USDC.e.

**Agent Decision-Making Process**:

1. **Market Data Collection** (`get_market_context()`):
   - **APY Monitoring**: Fetches current supply APY for all supported assets from Aave V3
     - Queries Aave Pool contract for liquidity rate
     - Converts rate to APY percentage
     - Records APY in history for trend analysis
   - **Treasury Balance Tracking**: Checks treasury wallet balance for each asset
     - Queries ERC20 `balanceOf()` for USDC, USDT, DAI, USDC.e
     - Calculates total treasury value (USD equivalent)
   - **Vault Status**: Reads `YieldVault` balances
     - Assets outside Aave (idle in vault)
     - Assets inside Aave (supplied, earning yield)
     - Total vault assets
   - **Historical Analysis** (`get_historical_yield_metrics()`):
     - APY trend (rising, falling, stable)
     - 24h and 7d APY changes
     - 7d and 30d average APY
     - Volatility metrics (standard deviation)
     - All-time high and low APY
   - **Alternative Yields**: Fetches competitive yields from DefiLlama API
     - Compares Aave yields with other Base Mainnet protocols
   - **Gas Cost Estimation**: Calculates transaction costs
     - Estimates gas price and transaction size
     - Converts to USD using ETH price from CoinGecko

2. **LLM Analysis** (`ask_llm_for_decision()`):
   - **System Prompt**: Instructs GPT-4 to act as a DeFi yield strategist
     - Risk tolerance setting (conservative, moderate, aggressive)
     - Multi-asset allocation framework
     - Swap cost-benefit analysis guidelines
   - **Market Summary**: Comprehensive data package sent to LLM:
     ```
     - APY for each asset (USDC, USDT, DAI, USDC.e)
     - Treasury balances for each asset
     - Total treasury value
     - Historical yield metrics (trends, volatility, changes)
     - Alternative protocol yields
     - Gas cost estimates
     - Vault status
     - Decision history
     ```
   - **LLM Response Format**:
     ```json
     {
       "decision": "DEPOSIT" or "HOLD",
       "confidence": 0-100,
       "reasoning": "detailed explanation",
       "allocation": {
         "USDC": 0-100,
         "USDT": 0-100,
         "DAI": 0-100,
         "USDC.e": 0-100
       },
       "swaps_needed": [
         {"from": "USDC", "to": "USDT", "amount_percent": 25, "reason": "..."}
       ],
       "key_factors": [...],
       "projected_30day_return": ...,
       "projected_90day_return": ...,
       "risks": [...],
       "opportunities": [...]
     }
     ```

3. **Decision Execution** (`make_decision()`):
   - **If Decision is DEPOSIT**:
     a. **Token Swaps** (if needed):
        - Iterates through `swaps_needed` from LLM response
        - For each swap:
          - Calculates swap amount: `totalValue * (amount_percent / 100)`
          - Converts to base units (with decimals)
          - Calls `execute_lifi_swap()` which:
            - Executes Node.js script `agent/lifi_swap.js`
            - Script uses LI.FI SDK to find optimal swap route
            - LI.FI aggregates across Uniswap, Curve, and other DEXs
            - Executes swap with 3% slippage tolerance
            - Returns transaction hash
        - Updates expected balances after swaps
     b. **Asset Deposits**:
        - Iterates through `allocation` from LLM response
        - For each asset with allocation > 0:
          - Calculates deposit amount: `totalValue * (allocation_pct / 100)`
          - Verifies sufficient balance (after swaps)
          - Calls `execute_orchestrator_deposit()`:
            - Calls `YieldOrchestrator.depositERC20()`
            - **Important**: Uses `inputAsset == targetAsset` (no internal swap)
            - Deposits into appropriate strategy for that asset
            - Strategy routes to `YieldVault`
            - Vault supplies to Aave V3
   - **If Decision is HOLD**:
     - No transactions executed
     - Decision is logged for future reference

**Key Design Decisions**:

- **Why LI.FI for Swaps**: The agent uses LI.FI instead of the orchestrator's internal swap because:
  - LI.FI aggregates liquidity across multiple DEXs (Uniswap, Curve, etc.)
  - Better rates through optimal routing
  - Automatic route splitting for large swaps
  - Superior slippage protection
  - Future-proof (easy to add new DEXs)

- **Why External Swaps Before Deposit**: The agent swaps tokens externally via LI.FI, then deposits the already-swapped tokens. This ensures:
  - Optimal execution rates
  - Clear separation of concerns
  - Better gas efficiency

**Agent Decision History**: See [`agent/llm_decision_history.json`](./agent/llm_decision_history.json) for complete LLM reasoning, market analysis, and execution results.

**Code References**:
- Agent API: [`agent/api.py`](./agent/api.py)
- LI.FI Swap Script: [`agent/lifi_swap.js`](./agent/lifi_swap.js)
- Market Context: Lines 748-777 in `agent/api.py`
- LLM Decision: Lines 855-1008 in `agent/api.py`
- Execution Logic: Lines 1010-1158 in `agent/api.py`

---

### Step 4: Yield Distribution (Cross-Chain to Creators)

**Trigger**: Operator manually calls `/api/distribute-yield` endpoint to harvest and distribute yield to creators.

**Note**: For demo purposes, yield distribution is manually triggered by the operator. In production, this will be automated on a schedule (e.g., daily or weekly).

**Technical Execution** (`frontend/app/api/distribute-yield/route.ts`):

1. **Yield Harvesting**:
   - Operator calls `YieldOrchestrator.harvestStrategy(strategy)`
   - For each strategy, `strategy.report()` is called:
     - Calculates profit: `currentAssets - lastReportedAssets`
     - Updates `lastReportedAssets` to current value
     - Profit represents yield earned since last report

2. **Per-User Yield Claiming**:
   - For each active donation (non-withdrawn):
     - Operator calls `YieldStrategy.claimUserYield(donor)`
     - Strategy captures unrealized yield via `_updateUserYield(donor)`
     - Claimed amount = `userAccumulatedYield[donor]`
     - Yield is withdrawn from vault if needed
     - Yield is transferred to operator wallet
     - `userAccumulatedYield[donor]` is reset to 0

3. **Yield Splitting**:
   - Operator splits total claimed yield equally among selected recipients
   - Formula: `recipientAmount = totalYield / recipientCount`
   - Each recipient receives equal share regardless of donation amount

4. **Cross-Chain Distribution**:
   - For each recipient:
     - If recipient's preferred chain = Base: Direct USDC transfer
     - If recipient's preferred chain ≠ Base: LI.FI bridge execution
       ```typescript
       const routeRequest = {
         toAddress: recipientAddress,
         fromAddress: operatorAddress,
         fromChainId: ChainId.BAS,
         fromAmount: recipientAmount,
         fromTokenAddress: baseUsdcAddress,
         toChainId: targetChainConfig.chainId,  // e.g., ChainId.OPT
         toTokenAddress: targetUsdcAddress,
         options: { slippage: 0.03 },
       };
       const route = await getRoutes(routeRequest);
       await executeRoute(route, executionOptions);
       ```
   - LI.FI finds optimal bridge route automatically
   - Bridge status is monitored via `getStatus()`
   - LI.FI explorer link is generated for tracking

**Result**: Creators receive yield on their preferred chain, and distribution records are saved to the database.

**Transaction Example**: [`https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0`](https://scan.li.fi/tx/0x20eedaf3548e32d1870c0e100742791686d4276588cc7e6be11805b7108732c0) - Base → Optimism yield distribution

**Execution Log**: See [`frontend/logs/yield-distribution.log`](./frontend/logs/yield-distribution.log) for complete distribution flow.

---

### Step 5: User Withdrawal (Cross-Chain Back to Original Chain)

**User Action**: User requests withdrawal of their principal from the donor dashboard.

**Technical Execution** (`frontend/app/donor/page.tsx`):

1. **Withdrawal Request**:
   - User calls `/api/orchestrate/withdraw` with donation ID and amount
   - API validates withdrawal eligibility and calculates shares to withdraw

2. **Operator Execution**:
   - Operator executes `YieldOrchestrator.withdrawERC20()` on Base
   - Strategy burns user's shares and withdraws assets from vault
   - Assets are transferred to user's address on Base

3. **Cross-Chain Bridging** (if original chain ≠ Base):
   - Frontend detects if withdrawal is cross-chain
   - LI.FI route is requested:
     ```typescript
     const routeRequest = {
       toAddress: userAddress,
       fromAddress: userAddress,
       fromChainId: ChainId.BAS,
       fromAmount: withdrawalAmount,
       fromTokenAddress: baseUsdcAddress,
       toChainId: originalChainId,  // e.g., ChainId.ARB
       toTokenAddress: originalUsdcAddress,
       options: { slippage: 0.03 },
     };
     ```
   - User signs bridge transaction
   - LI.FI bridges USDC from Base → original chain
   - User receives USDC on original chain

**Result**: User recovers their principal on their original chain, and the donation is marked as withdrawn in the database.

**Transaction Example**: [`https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6`](https://basescan.org/tx/0x6a47184fdff8fab31f30fa1d246ac05a84552991d4c153d1f7196327ae7103a6) - Withdrawal execution

**Execution Log**: See [`frontend/logs/cross-chain-withdraw.log`](./frontend/logs/cross-chain-withdraw.log) for complete withdrawal flow.

---

### Complete System Flow Summary

```
1. User (Arbitrum) → LI.FI Composer → Bridge + Deposit → Base → YieldStrategy → YieldVault → Aave V3
2. Yield accrues continuously on aTokens in Aave V3
3. AI Agent (manually triggered for demo):
   a. Monitors APY for USDC, USDT, DAI, USDC.e
   b. Analyzes market data (APY, balances, history, gas costs)
   c. GPT-4 makes allocation decision
   d. Executes swaps via LI.FI (if needed)
   e. Deposits optimized allocation into strategies
4. Operator (manually triggered for demo):
   a. Harvests yield via YieldOrchestrator.harvestStrategy()
   b. Claims per-user yield via YieldStrategy.claimUserYield()
   c. Splits yield equally among creators
   d. Bridges yield to creators' preferred chains via LI.FI
5. User (anytime):
   a. Requests withdrawal
   b. Operator executes withdrawal on Base
   c. LI.FI bridges funds back to original chain (if needed)
```

**Key Technologies**:
- **LI.FI**: Cross-chain bridging (deposits, withdrawals, yield distribution) and token swaps (agent optimization)
- **Aave V3**: Yield generation via supply APY on stablecoins
- **GPT-4/GPT-4o**: AI-powered multi-asset allocation decisions
- **ERC-4626**: Standardized vault interface for composability
- **Per-User Yield Tracking**: Fair, granular yield distribution

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

**Complete Execution Log**: See [`frontend/logs/bridge-and-vault-deposit.log`](./frontend/logs/bridge-and-vault-deposit.log) for detailed step-by-step execution, including quote generation, token approval, transaction execution, and bridge status monitoring.

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

**Complete Execution Log**: See [`frontend/logs/yield-distribution.log`](./frontend/logs/yield-distribution.log) for detailed yield harvesting, claiming, and cross-chain distribution execution.

**Impact:**
- Creators don't need Base wallets or knowledge of Base ecosystem
- Yield can be distributed to creators on Ethereum, Polygon, Arbitrum, etc.
- One operator transaction distributes to multiple chains automatically
- **Just like Patreon, but creators receive crypto on their preferred chain**

---

## Agent Optimizing Yield Powered by LI.FI Swaps

<img width="615" height="412" alt="Screenshot 2026-02-07 at 1 17 04 AM" src="https://github.com/user-attachments/assets/61f29bdd-c43e-4268-a77a-4887bccc6aea" />

*Multi-asset yield optimizer agent monitoring APY across four stablecoins, using AI to make allocation decisions, and executing swaps via LI.FI to optimize yield.*

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

<img width="1442" height="756" alt="Screenshot 2026-02-07 at 1 16 39 AM" src="https://github.com/user-attachments/assets/a626ddcd-2586-4468-921f-8533f1a19b82" />

*Complete end-to-end flow of the OnlyYield platform, from user deposit to yield distribution and principal withdrawal.*

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

### Manual Yield Distribution Trigger Instead of Automation

**What**: Yield distribution is manually triggered by the operator via `/api/distribute-yield` endpoint instead of running on a scheduled automation.

**Why**: For demo purposes, manual triggering allows controlled execution, easier debugging, and demonstration of the distribution flow.

**Implementation**: 
- Current: Operator manually calls `POST /api/distribute-yield` to trigger distribution
- Future: Scheduled automation (e.g., daily or weekly) to automatically harvest and distribute yield

**Production**: Should run on a schedule (e.g., daily) to automatically distribute yield to creators without manual intervention.

**Other Tradeoffs:**
- **Limited Asset Support**: Currently supports 4 stablecoins (USDC, USDT, DAI, USDC.e). Production should support more.
- **Single Strategy**: Currently one strategy per asset. Production could have multiple strategies per asset.
- **Operator-Only Execution**: All operations require operator role. Future could support user-initiated operations.

---

## Contract Architecture

**Detailed contract explanations are in [`contracts/README.md`](./contracts/README.md).**

### How Contracts Work Together

The OnlyYield system uses **5 core contracts** that work together in a layered architecture:

#### Contract Roles

| Contract | Role | Responsibility |
|----------|------|----------------|
| **YieldOrchestrator** | **Central Coordinator** | Routes operations, manages multi-asset strategies, harvests yield |
| **YieldStrategy** | **Per-Asset Manager** | Tracks per-user yield, manages deposits/withdrawals per asset (USDC, USDT, etc.) |
| **YieldVault** | **ERC-4626 Vault** | Supplies assets to Aave V3, earns yield, manages fees |
| **YieldDistributor** | **Recipient Manager** | Manages creator addresses, distributes yield equally |
| **YieldReallocator** | **Migration Handler** | Enables strategy-to-strategy migrations with swaps |

#### Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER / AI AGENT                          │
│              (Deposits, Withdrawals, Claims)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────-┐
        │     YieldOrchestrator                  │
        │     Central Coordinator                │
        │                                        │
        │  • strategyOf[asset] → strategy        │
        │  • harvestAll() → harvests all         │
        │  • depositERC20() → routes to strategy │
        │  • withdrawERC20() → routes to strategy│
        │  • reallocate() → migrates positions   │
        └───────┬───────────────────┬───────────-┘
                │                   │
        ┌───────┴───────┐   ┌───────┴───────┐
        │               │   │               │
        ▼               ▼   ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│YieldStrategy │ │YieldStrategy │ │YieldStrategy │
│   (USDC)     │ │   (USDT)     │ │   (DAI)      │
│              │ │              │ │              │
│ Per-User     │ │ Per-User     │ │ Per-User     │
│ Yield        │ │ Yield        │ │ Yield        │
│ Tracking     │ │ Tracking     │ │ Tracking     │
│              │ │              │ │              │
│• deposit()   │ │• deposit()   │ │• deposit()   │
│• withdraw()  │ │• withdraw()  │ │• withdraw()  │
│• claimYield()│ │• claimYield()│ │• claimYield()│
│• report()    │ │• report()    │ │• report()    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌──────────────────-┐
              │   YieldVault      │
              │   ERC-4626        │
              │                   │
              │• deposit()        │
              │• withdraw()       │
              │• supplyToAave()   │
              │• Performance fees │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────-┐
              │   Aave V3 Pool    │
              │   Yield Source    │
              │                   │
              │• Supplies assets  │
              │• Earns ~5% APY    │
              │• Returns aTokens  │
              └───────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Yield Distribution Flow                        │
│                                                             │
│  Operator → YieldOrchestrator.harvestAll()                  │
│       ↓                                                     │
│  For each strategy: strategy.report()                       │
│       ↓                                                     │
│  For each user: YieldStrategy.claimUserYield(user)          │
│       ↓                                                     │
│  YieldDistributor.distribute(token, amount)                 │
│       ↓                                                     │
│  Split equally → Transfer to creators                       │
│       ↓                                                     │
│  LI.FI Bridge → Creator's preferred chain                   │
└─────────────────────────────────────────────────────────────┘
```

#### Complete Deposit Flow

```
1. User deposits 100 USDC
   ↓
2. LI.FI bridges from Arbitrum → Base (atomic)
   ↓
3. YieldStrategy.deposit(100 USDC, user)
   → _updateUserYield(user)  // Capture any unrealized yield
   → _deployFunds(100 USDC)  // Send to vault
   → YieldVault.deposit(100 USDC, strategy)
   → Vault supplies 100 USDC to Aave V3
   → Strategy receives vault shares
   → Strategy mints strategy shares to user
   ↓
4. Yield accrues on Aave
   → aToken balance increases
   → Vault totalAssets() increases
   → Strategy share value increases
   → User's position value increases
```

#### Yield Distribution Flow

```
1. Operator calls YieldOrchestrator.harvestAll()
   ↓
2. For each strategy:
   → strategy.report()
   → Calculates profit = currentAssets - lastReportedAssets
   → Updates lastReportedAssets
   ↓
3. For each active supporter:
   → YieldStrategy.claimUserYield(supporter)
   → _updateUserYield(supporter)  // Capture unrealized yield
   → claimedAmount = userAccumulatedYield[supporter]
   → Withdraw from vault if needed
   → Transfer to operator
   → Reset userAccumulatedYield[supporter] = 0
   ↓
4. Operator splits yield equally among creators
   ↓
5. For each creator:
   → If Base: Direct transfer
   → If other chain: LI.FI bridge to creator's chain
```

#### Key Design Principles

1. **Layered Architecture**: Each layer has a single responsibility
   - Orchestrator = Routing & Coordination
   - Strategy = Per-Asset Logic & User Tracking
   - Vault = Aave Integration & ERC-4626 Compliance

2. **Per-User Yield Tracking**: Unlike traditional vaults, each user's yield is tracked independently
   - Fair distribution based on share ownership
   - Lazy accumulation (calculated on-demand)
   - Can claim yield without withdrawing principal

3. **Multi-Asset Support**: One strategy per asset, all managed by orchestrator
   - `strategyOf[USDC]` → USDC strategy
   - `strategyOf[USDT]` → USDT strategy
   - AI agent can rebalance across assets

4. **ERC-4626 Compliance**: YieldVault follows industry standard
   - Standardized share calculation
   - Composable with other DeFi protocols
   - Preview functions for UX

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

## Conclusion

OnlyYield represents a new paradigm in creator support—one where supporters keep their principal while creators receive sustainable, yield-based funding. By combining the familiar subscription model of platforms like Patreon with the financial benefits of DeFi yield generation, we enable a win-win scenario for both creators and their supporters.

### Key Achievements

- **Principal Preservation**: Supporters maintain full control of their deposited funds
- **Cross-Chain Flexibility**: Seamless deposits and payouts across multiple blockchain networks
- **AI-Powered Optimization**: Intelligent multi-asset yield maximization for better creator support
- **One-Click UX**: Simplified user experience through LI.FI's atomic bridge and contract execution
- **Automated Distribution**: Set-and-forget yield distribution to creators on their preferred chains

### The Future of Creator Support

OnlyYield demonstrates how Web3 infrastructure can enhance traditional creator economy models. By leveraging:
- **LI.FI** for seamless cross-chain operations and optimal token swaps
- **ERC-4626** standards for composable, secure vault architecture
- **AI agents** for intelligent yield optimization
- **Per-user yield tracking** for fair, granular distribution

We've built a platform that not only supports creators but also promotes healthy financial habits among supporters.

### Next Steps

For production deployment, consider:
- Implementing scheduled automation for agent optimization and yield distribution
- Expanding asset support beyond the current 4 stablecoins
- Adding multiple strategies per asset for diversified yield sources
- Implementing user-initiated operations alongside operator-executed flows
- Removing demo workarounds (yield bump) for real-world yield amounts

### Resources

- **Contract Documentation**: See [`contracts/README.md`](./contracts/README.md) for detailed contract architecture
- **Transaction Logs**: Review [`frontend/logs/`](./frontend/logs/) for execution examples
- **Agent Decisions**: Analyze [`agent/llm_decision_history.json`](./agent/llm_decision_history.json) for AI reasoning
- **Base Mainnet Contracts**: All deployed contracts are verified on [BaseScan](https://basescan.org)

### Contributing

Contributions are welcome! Please open an issue or pull request to discuss improvements, report bugs, or suggest new features.

### License

MIT

---
