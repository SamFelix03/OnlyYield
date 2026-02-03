# OnlyYield Smart Contracts - Base Mainnet Deployment

A complete, production-ready system for multi-asset yield generation, AI-powered orchestration, and automated yield distribution to public goods creators. Deployed on **Base Mainnet (Chain ID: 8453)**.

---

## 🚀 Base Mainnet Deployment Details

### Contract Addresses (Base Mainnet)

| Contract | Address | Explorer | Deployment TX |
|----------|---------|----------|---------------|
| **YieldVault** | [`0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544`](https://basescan.org/address/0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544) | [BaseScan](https://basescan.org/address/0xE663e41927f1E20cC9E3D27c18829ad2A1A0F544) | [`0x0b92945ec4833d5463e3fafa0caf5aa09d003d67a7811aa9f4f0344cae2b1cbb`](https://basescan.org/tx/0x0b92945ec4833d5463e3fafa0caf5aa09d003d67a7811aa9f4f0344cae2b1cbb) |
| **YieldStrategy** | [`0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0`](https://basescan.org/address/0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0) | [BaseScan](https://basescan.org/address/0xB8FAd7401DA195CfF5b7E62e4c7094920dC8FEe0) | [`0x6c933cd3ef37a6b34d2a5f4d2432deb8f51fa4a2b305bfd4dc9a1e61bdcb6717`](https://basescan.org/tx/0x6c933cd3ef37a6b34d2a5f4d2432deb8f51fa4a2b305bfd4dc9a1e61bdcb6717) |
| **YieldOrchestrator** | [`0xEc67546d493484c4dBB749fdD6765D61E24369DA`](https://basescan.org/address/0xEc67546d493484c4dBB749fdD6765D61E24369DA) | [BaseScan](https://basescan.org/address/0xEc67546d493484c4dBB749fdD6765D61E24369DA) | [`0x21a374120589e73e1c7e230c50ee010f28464df3b818e0fdeb48f4b2f8d0c7c0`](https://basescan.org/tx/0x21a374120589e73e1c7e230c50ee010f28464df3b818e0fdeb48f4b2f8d0c7c0) |
| **YieldDistributor** | [`0x787457C404f9ddB42978Ed3be15359AD166F9910`](https://basescan.org/address/0x787457C404f9ddB42978Ed3be15359AD166F9910) | [BaseScan](https://basescan.org/address/0x787457C404f9ddB42978Ed3be15359AD166F9910) | [`0xeb56fa1d3896dcfacb772d6412d7ca93614308782d1c2b591f01ea8631f94a30`](https://basescan.org/tx/0xeb56fa1d3896dcfacb772d6412d7ca93614308782d1c2b591f01ea8631f94a30) |
| **YieldReallocator** | [`0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4`](https://basescan.org/address/0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4) | [BaseScan](https://basescan.org/address/0x9c95160Fc6759e655Dbb77Bb0C2e1A21665F71a4) | [`0x5add10d6dcca5c5ca63e98a28bf1c643812173307c7f4f8679e49b4f8bbf8a5c`](https://basescan.org/tx/0x5add10d6dcca5c5ca63e98a28bf1c643812173307c7f4f8679e49b4f8bbf8a5c) |

### Deployment Information

- **Network**: Base Mainnet (Chain ID: 8453)
- **Deployer**: `0x6100Ae3b9EAC8B3eB7673eaCe7e3561b571aAa5B`
- **Operator (AI Agent)**: `0x6100Ae3b9EAC8B3eB7673eaCe7e3561b571aAa5B`
- **Deployment Block**: 41743063 - 41743076
- **Total Gas Used**: 9,828,445 gas
- **Total Cost**: 0.000165866627038726 ETH
- **All Contracts Verified**: ✅ Yes

### Deployment Run

**Latest Deployment JSON**: [`broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json`](./broadcast/DeployCompleteSystem.s.sol/8453/run-latest.json)

**Deployment Log**: [`deploy-base.log`](./deploy-base.log)

### Base Mainnet External Addresses

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **aUSDC (Aave)**: `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`
- **Aave V3 Pool**: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`
- **Uniswap V3 Router**: `0x2626664c2603336E57B271c5C0b26F421741e481`

---

## 🏗️ Architecture Overview

The OnlyYield contract system is architected as a **layered, composable, multi-asset yield generation and distribution platform**. The architecture enables:

1. **Multi-Asset Support**: Each asset (USDC, USDT, DAI, etc.) can have its own strategy and vault
2. **AI-Powered Orchestration**: Central orchestrator manages all strategies and enables automated rebalancing
3. **Per-User Yield Tracking**: Fair, proportional yield distribution based on share ownership
4. **Cross-Asset Reallocation**: Seamless migration between strategies with optional swaps
5. **ERC-4626 Compliance**: Standardized vault interface for maximum composability

### Architectural Advantages

#### 1. **Modularity & Composability**

Each contract has a single, well-defined responsibility:
- **YieldVault**: ERC-4626 compliant asset management and Aave integration
- **YieldStrategy**: Per-asset strategy with user yield tracking
- **YieldOrchestrator**: Multi-asset coordination and AI agent interface
- **YieldDistributor**: Flexible recipient management and distribution
- **YieldReallocator**: Strategy migration with aggregator support

This modularity enables:
- **Independent Upgrades**: Each component can be upgraded without affecting others
- **Multiple Strategies Per Asset**: Can deploy different strategies for the same asset
- **Easy Integration**: Other protocols can integrate with individual components
- **Testability**: Each contract can be tested in isolation

#### 2. **Multi-Asset Orchestration**

The `YieldOrchestrator` acts as the **central nervous system** for multi-asset management:

```solidity
mapping(address => address) public strategyOf; // asset => strategy
address[] public strategies; // All registered strategies
```

**Key Capabilities:**
- **Asset-to-Strategy Registry**: One strategy per asset (can be extended to multiple)
- **Unified Harvesting**: `harvestAll()` harvests yield from all strategies in one call
- **Cross-Asset Operations**: `depositERC20()` and `withdrawERC20()` handle swaps automatically
- **Reallocation**: `reallocate()` migrates positions between strategies with optional swaps

**How Multi-Asset Works:**
1. Deploy separate `YieldStrategy` contracts for each asset (USDC, USDT, DAI, etc.)
2. Register each strategy in `YieldOrchestrator` via `setStrategy(asset, strategy)`
3. AI agent monitors APY across all assets
4. Agent calls `depositERC20()` with different `targetAsset` parameters
5. Orchestrator routes to the correct strategy, handling swaps if needed
6. `harvestAll()` collects yield from all strategies simultaneously

#### 3. **Per-User Yield Tracking**

Unlike traditional vaults that distribute yield proportionally at withdrawal, `YieldStrategy` tracks yield **per user**:

```solidity
mapping(address => uint256) public userAccumulatedYield;
mapping(address => uint256) public userLastReportedValue;
```

**Advantages:**
- **Fair Distribution**: Each user's yield is tracked independently
- **Lazy Accumulation**: Yield is calculated on-demand (gas efficient)
- **Flexible Claiming**: Users can claim yield without withdrawing principal
- **Multiple Recipients**: Each user can have different recipients per donation

**How It Works:**
1. User deposits → `_updateUserYield(user)` calculates current position value
2. Compare `currentValue` vs `userLastReportedValue[user]`
3. If `currentValue > lastValue`: `userAccumulatedYield[user] += difference`
4. Update `userLastReportedValue[user] = currentValue`
5. Yield can be claimed via `claimUserYield(user)` without withdrawing

#### 4. **ERC-4626 Standard Compliance**

`YieldVault` implements the full ERC-4626 standard, providing:
- **Standardized Interface**: Compatible with all ERC-4626 tooling and integrations
- **Preview Functions**: `previewDeposit()`, `previewWithdraw()`, etc.
- **Share Calculation**: Standardized share math prevents rounding errors
- **Composability**: Can be integrated into other DeFi protocols seamlessly

#### 5. **Gas Efficiency**

Multiple optimizations reduce gas costs:
- **Lazy Yield Accumulation**: Only calculates yield when users interact
- **Batch Operations**: `harvestAll()` processes all strategies in one transaction
- **Max Approvals**: Uses `type(uint256).max` approvals to avoid repeated approvals
- **Reentrancy Guards**: Efficient `nonReentrant` modifiers

---

## 📋 Contract Structures & Interactions

### 1. YieldVault (ERC-4626 Vault)

**File**: `src/core/YieldVault.sol`

**Purpose**: ERC-4626 compliant vault that supplies assets to Aave V3 and manages performance fees.

#### Key State Variables

```solidity
IERC20 public immutable UNDERLYING;        // Asset token (e.g., USDC)
IERC20 public immutable A_TOKEN;            // Aave aToken (e.g., aUSDC)
IAaveV3Pool public immutable aavePool;     // Aave V3 Pool
address public treasury;                   // Fee recipient
uint16 public feeBps;                      // Fee in basis points (max 1500 = 15%)
bool public autoSupply;                    // Auto-supply to Aave toggle
bool public publicDepositsEnabled;         // Public deposit toggle
uint256 public lastCheckpointAssets;       // For fee calculation
uint256 public lastCheckpointTimestamp;    // Last checkpoint time
mapping(address => bool) public strategies; // Whitelisted strategies
```

#### Key Functions

**Deposit & Withdraw (ERC-4626 Standard):**
```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
```

**Aave Integration:**
```solidity
function supplyToAave(uint256 amount) external onlyRole(OPERATOR_ROLE)
function withdrawFromAave(uint256 amount) external onlyRole(OPERATOR_ROLE)
```

**Performance Fees:**
```solidity
function takeFees() external onlyRole(OPERATOR_ROLE) returns (uint256 feeAssets, uint256 feeShares)
function checkpoint() external onlyRole(OPERATOR_ROLE) // Updates lastCheckpointAssets
```

**Strategy Management:**
```solidity
function addStrategy(address strategy) external onlyRole(DEFAULT_ADMIN_ROLE)
function removeStrategy(address strategy) external onlyRole(DEFAULT_ADMIN_ROLE)
```

#### How It Works

1. **Deposit Flow**:
   ```
   User → deposit(assets) → Vault receives assets
   → If autoSupply: supplyToAave(idle) → Vault receives aTokens
   → Vault mints shares to user
   ```

2. **Yield Generation**:
   ```
   Aave V3 → Interest accrues on aTokens
   → aToken balance increases
   → totalAssets() = idleUnderlying + aTokenBalance increases
   → Share value increases
   ```

3. **Fee Calculation**:
   ```
   checkpoint() → Updates lastCheckpointAssets
   takeFees() → Calculates: currentAssets - lastCheckpointAssets
   → If gain > 0: feeAssets = (gain * feeBps) / 10_000
   → Mints feeShares to treasury
   ```

#### Architectural Advantages

- **ERC-4626 Compliance**: Full standard implementation enables composability
- **Flexible Deposit Modes**: Public or strategy-only deposits
- **Auto-Supply**: Optional automatic Aave allocation after deposits
- **Performance Fees**: Fees taken in shares (not assets), preserving capital
- **Strategy Whitelisting**: Can restrict deposits to approved strategies only

---

### 2. YieldStrategy (Per-User Yield Tracking)

**File**: `src/core/YieldStrategy.sol`

**Purpose**: ERC-20 strategy token that deploys assets into `YieldVault` and tracks per-user yield.

#### Key State Variables

```solidity
IERC20 public immutable assetToken;        // Asset this strategy handles (e.g., USDC)
YieldVault public vault;                  // Vault this strategy deploys to
uint256 public lastReportedAssets;         // Assets at last report (for profit/loss)
uint256 public lastReportedTimestamp;     // Timestamp of last report
mapping(address => uint256) public userAccumulatedYield;      // Per-user yield
mapping(address => uint256) public userLastReportedValue;     // User's position value at last report
```

#### Key Functions

**Deposit & Withdraw:**
```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
```

**Yield Tracking:**
```solidity
function _updateUserYield(address user) internal // Updates user's accumulated yield
function getUserYield(address user) external view returns (uint256) // Returns accumulated + unrealized yield
function claimUserYield(address user) external onlyRole(OPERATOR_ROLE) returns (uint256)
```

**Profit/Loss Reporting:**
```solidity
function report() external onlyRole(OPERATOR_ROLE) returns (uint256 profit, uint256 loss)
```

**Fund Management:**
```solidity
function _deployFunds(uint256 amount) internal // Deposits into vault
function _freeFunds(uint256 amount) internal   // Withdraws from vault
```

#### How It Works

1. **Deposit Flow**:
   ```
   User → deposit(assets, receiver)
   → Strategy pulls assets from user
   → _updateUserYield(user) // Capture any unrealized yield
   → _deployFunds(assets) → vault.deposit(assets, strategy)
   → Strategy receives vault shares
   → Strategy mints strategy shares to user
   ```

2. **Yield Accumulation (Lazy)**:
   ```
   User interacts (deposit/withdraw/claim)
   → _updateUserYield(user) called
   → currentValue = (userShares * totalAssets) / totalSupply
   → If currentValue > userLastReportedValue[user]:
     → userAccumulatedYield[user] += (currentValue - userLastReportedValue[user])
   → Update userLastReportedValue[user] = currentValue
   ```

3. **Yield Claiming**:
   ```
   Operator → claimUserYield(user)
   → _updateUserYield(user) // Capture any unrealized yield
   → claimedAmount = userAccumulatedYield[user]
   → If vault idle < claimedAmount: vault.withdraw(needed)
   → Transfer claimedAmount to operator
   → userAccumulatedYield[user] = 0
   ```

4. **Profit/Loss Reporting**:
   ```
   Operator → report()
   → currentAssets = totalAssets()
   → profit = currentAssets > lastReportedAssets ? difference : 0
   → loss = currentAssets < lastReportedAssets ? difference : 0
   → Emit ProfitReported or LossReported
   → Update lastReportedAssets = currentAssets
   ```

#### Architectural Advantages

- **Per-User Tracking**: Each user's yield is tracked independently
- **Lazy Accumulation**: Gas-efficient, only calculates when needed
- **ERC-20 Shares**: Strategy shares are transferable ERC-20 tokens
- **Flexible Claiming**: Yield can be claimed without withdrawing principal
- **Vault Abstraction**: Can switch vaults without redeploying strategy

---

### 3. YieldOrchestrator (Multi-Asset Coordinator)

**File**: `src/core/YieldOrchestrator.sol`

**Purpose**: Central control point for AI agent operations across all strategies and assets.

#### Key State Variables

```solidity
IUniswapV3Router public immutable uniswapRouter;  // Uniswap V3 router for swaps
uint24 public immutable defaultPoolFee;          // Default pool fee (e.g., 3000 = 0.3%)
mapping(address => address) public strategyOf;   // asset => strategy registry
address[] public strategies;                      // All registered strategies
mapping(address => bool) public isStrategyRegistered; // Strategy registration tracking
```

#### Key Functions

**Strategy Registry:**
```solidity
function setStrategy(address asset, address strategy) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Deposit with Optional Swap:**
```solidity
function depositERC20(
    address from,
    address inputAsset,
    uint256 amountIn,
    address targetAsset,
    uint256 minAmountOut,
    address receiver
) external onlyRole(OPERATOR_ROLE) returns (uint256 sharesOut)
```

**Withdraw with Optional Swap:**
```solidity
function withdrawERC20(
    address owner,
    address strategyAsset,
    uint256 assets,
    address outputAsset,
    uint256 minAmountOut,
    address receiver
) external onlyRole(OPERATOR_ROLE) returns (uint256 amountOut)
```

**Reallocation:**
```solidity
function reallocate(
    address owner,
    address sourceAsset,
    address targetAsset,
    uint256 shares,
    uint256 minAmountOut
) external onlyRole(OPERATOR_ROLE) returns (uint256 sharesOut)
```

**Harvesting:**
```solidity
function harvestAll() external onlyRole(OPERATOR_ROLE) // Harvests all strategies
function harvestStrategy(address strategy) external onlyRole(OPERATOR_ROLE) // Harvests one strategy
```

#### How It Works

1. **Multi-Asset Deposit**:
   ```
   AI Agent → depositERC20(from, inputAsset, amountIn, targetAsset, minAmountOut, receiver)
   → If inputAsset != targetAsset:
     → Swap inputAsset → targetAsset via Uniswap V3
   → Get strategy = strategyOf[targetAsset]
   → strategy.deposit(swappedAmount, receiver)
   → Returns strategy shares
   ```

2. **Multi-Asset Withdrawal**:
   ```
   AI Agent → withdrawERC20(owner, strategyAsset, assets, outputAsset, minAmountOut, receiver)
   → Get strategy = strategyOf[strategyAsset]
   → strategy.withdraw(assets, orchestrator, owner)
   → If strategyAsset != outputAsset:
     → Swap strategyAsset → outputAsset via Uniswap V3
   → Transfer outputAsset to receiver
   ```

3. **Reallocation**:
   ```
   AI Agent → reallocate(owner, sourceAsset, targetAsset, shares, minAmountOut)
   → Get sourceStrategy = strategyOf[sourceAsset]
   → Get targetStrategy = strategyOf[targetAsset]
   → sourceStrategy.withdraw(shares → assets, orchestrator, owner)
   → If sourceAsset != targetAsset:
     → Swap sourceAsset → targetAsset via Uniswap V3
   → targetStrategy.deposit(swappedAmount, owner)
   → Returns new strategy shares
   ```

4. **Batch Harvesting**:
   ```
   AI Agent → harvestAll()
   → Loop through strategies[]:
     → strategy.report() // Calculates profit/loss
     → Emit YieldHarvested event
   ```

#### Architectural Advantages

- **Unified Interface**: Single entry point for all multi-asset operations
- **Automatic Swaps**: Handles token swaps transparently
- **Strategy Registry**: One-to-one mapping of assets to strategies (extensible)
- **Batch Operations**: `harvestAll()` processes all strategies efficiently
- **AI Agent Friendly**: Designed for automated decision-making

---

### 4. YieldDistributor (Recipient Management)

**File**: `src/core/YieldDistributor.sol`

**Purpose**: Manages dynamically configurable recipient addresses and distributes yield equally.

#### Key State Variables

```solidity
address[] public recipients;              // List of active recipients
mapping(address => bool) public isRecipient; // Recipient existence check
```

#### Key Functions

**Recipient Management:**
```solidity
function addRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE)
function removeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE)
function setRecipients(address[] memory newRecipients) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**Distribution:**
```solidity
function distribute(address token, uint256 amount) external returns (uint256 distributed)
```

#### How It Works

1. **Recipient Management**:
   ```
   Admin → addRecipient(newAddress)
   → recipients.push(newAddress)
   → isRecipient[newAddress] = true
   ```

2. **Equal Distribution**:
   ```
   Operator → distribute(token, amount)
   → perRecipient = amount / recipientCount
   → Loop through recipients:
     → Transfer perRecipient to each recipient
     → If transfer fails: continue (graceful failure)
   → Return total distributed
   → If undistributed > 0: return to sender
   ```

#### Architectural Advantages

- **Dynamic Configuration**: Recipients can be changed without redeployment
- **Equal Split**: Yield split equally among all active recipients
- **Graceful Failures**: Failed transfers don't block other distributions
- **Gas Efficient**: Single loop processes all recipients

---

### 5. YieldReallocator (Strategy Migration)

**File**: `src/core/YieldReallocator.sol`

**Purpose**: Orchestrates user-approved migrations between yield strategies with optional aggregator swaps.

#### Key State Variables

```solidity
mapping(address => bool) public whitelistedAggregators; // Approved swap routers
```

#### Key Functions

**Migration:**
```solidity
function migrate(
    address sourceStrategy,
    address targetStrategy,
    uint256 shares,
    address aggregator,
    bytes calldata swapData,
    uint256 minAmountOut,
    uint256 deadline
) external returns (uint256 sharesOut)
```

**Permit Support:**
```solidity
function migrateWithPermit(
    // ... same params as migrate ...
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external returns (uint256 sharesOut)
```

#### How It Works

1. **Migration Flow**:
   ```
   User → migrate(sourceStrategy, targetStrategy, shares, aggregator, swapData, minAmountOut, deadline)
   → sourceStrategy.withdraw(shares → assets, reallocator, user)
   → If sourceAsset != targetAsset:
     → If aggregator != address(0):
       → Swap via aggregator (e.g., LI.FI, 1inch)
     → Else: revert (swap required but no aggregator)
   → targetStrategy.deposit(swappedAmount, user)
   → Returns new strategy shares
   ```

#### Architectural Advantages

- **Aggregator Support**: Can use any whitelisted swap aggregator (LI.FI, 1inch, etc.)
- **Permit Support**: Gasless approvals via EIP-2612
- **Slippage Protection**: `minAmountOut` prevents unfavorable swaps
- **Deadline Protection**: Time-bound operations prevent stale transactions

---

## 🔄 Complete Application Flow

### Flow 1: Cross-Chain Deposit → Yield Generation

```
1. User (Ethereum) → LI.FI Bridge → Base Mainnet
   ↓
2. LI.FI executes YieldStrategy.deposit() on Base
   ↓
3. YieldStrategy.deposit(assets, receiver)
   → _updateUserYield(receiver) // Capture yield
   → _deployFunds(assets)
   → YieldVault.deposit(assets, strategy)
   → If autoSupply: vault.supplyToAave(idle)
   → Strategy receives vault shares
   → Strategy mints strategy shares to receiver
   ↓
4. Yield accrues on Aave aTokens
   → aToken balance increases
   → vault.totalAssets() increases
   → strategy.totalAssets() increases
   → Strategy share value increases
```

### Flow 2: AI Agent Multi-Asset Rebalancing

```
1. AI Agent monitors APY for USDC, USDT, DAI, USDC.e
   ↓
2. AI decides: Reallocate 30% USDC → USDT
   ↓
3. AI Agent → YieldOrchestrator.reallocate(owner, USDC, USDT, shares, minAmountOut)
   ↓
4. Orchestrator:
   → Get USDC strategy = strategyOf[USDC]
   → Get USDT strategy = strategyOf[USDT]
   → USDC strategy.withdraw(shares → USDC, orchestrator, owner)
   ↓
5. Orchestrator swaps USDC → USDT via Uniswap V3
   ↓
6. Orchestrator:
   → USDT strategy.deposit(USDT, owner)
   → Returns USDT strategy shares
   ↓
7. Result: Owner now has USDT strategy shares (higher APY)
```

**Note**: In production, the AI agent uses LI.FI for swaps (better rates), then deposits via orchestrator.

### Flow 3: Yield Harvesting & Distribution

```
1. AI Agent → YieldOrchestrator.harvestAll()
   ↓
2. Orchestrator loops through all strategies:
   → strategy.report()
   → Calculates: currentAssets - lastReportedAssets
   → If profit > 0: Emit ProfitReported
   → Update lastReportedAssets
   ↓
3. For each active donation:
   → YieldStrategy.claimUserYield(donor)
   → _updateUserYield(donor) // Capture unrealized yield
   → claimedAmount = userAccumulatedYield[donor]
   → If vault idle < claimedAmount: vault.withdraw(needed)
   → Transfer claimedAmount to operator wallet
   → userAccumulatedYield[donor] = 0
   ↓
4. Operator splits yield equally among recipients
   ↓
5. For each recipient:
   → If preferred chain = Base: Direct transfer
   → If preferred chain ≠ Base: LI.FI bridge to recipient's chain
```

### Flow 4: Cross-Asset Deposit via Orchestrator

```
1. AI Agent has USDT in treasury, wants to deposit to USDC strategy
   ↓
2. AI Agent → YieldOrchestrator.depositERC20(
     from: treasury,
     inputAsset: USDT,
     amountIn: 1000 USDT,
     targetAsset: USDC,
     minAmountOut: 990 USDC,
     receiver: treasury
   )
   ↓
3. Orchestrator:
   → Pulls 1000 USDT from treasury
   → Swaps 1000 USDT → ~1000 USDC via Uniswap V3
   → Gets USDC strategy = strategyOf[USDC]
   → USDC strategy.deposit(1000 USDC, treasury)
   → Returns USDC strategy shares
   ↓
4. Treasury now holds USDC strategy shares
```

### Flow 5: User Withdrawal (Cross-Chain)

```
1. User requests withdrawal
   ↓
2. Operator → YieldOrchestrator.withdrawERC20(
     owner: user,
     strategyAsset: USDC,
     assets: 1000 USDC,
     outputAsset: USDC,
     minAmountOut: 1000 USDC,
     receiver: operator
   )
   ↓
3. Orchestrator:
   → Gets USDC strategy = strategyOf[USDC]
   → USDC strategy.withdraw(1000 USDC, orchestrator, user)
   → Strategy burns user's shares
   → Strategy withdraws from vault if needed
   → Transfers 1000 USDC to operator
   ↓
4. If user's original chain ≠ Base:
   → Operator uses LI.FI to bridge USDC back to original chain
   ↓
5. User receives USDC on original chain
```

---

## 🔐 Security Features

### Access Control

All contracts use OpenZeppelin's `AccessControl`:

- **DEFAULT_ADMIN_ROLE**: Full control, can grant/revoke roles
- **OPERATOR_ROLE**: Can execute operations (harvesting, deposits, withdrawals)
- **PAUSER_ROLE**: Can pause contracts in emergencies
- **STRATEGY_ROLE**: Can deposit to vault when `publicDepositsEnabled = false`

### Reentrancy Protection

All state-changing functions use `nonReentrant` modifier from OpenZeppelin's `ReentrancyGuard`.

### Slippage Protection

- All swaps require `minAmountOut` parameter
- `YieldOrchestrator` has `SLIPPAGE_TOLERANCE` constant (95% = 5% slippage max)

### Pausability

All contracts inherit `Pausable` and can be paused by `PAUSER_ROLE` in emergencies.

### Input Validation

- All functions validate inputs (non-zero addresses, valid amounts, etc.)
- Strategy registry validates asset-strategy matching

### Safe Math

Uses OpenZeppelin's `SafeERC20` and `Math` libraries for all arithmetic operations.

---

## 📊 Contract Interactions Diagram

```
┌─────────────────┐
│   User/Agent    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│    YieldOrchestrator            │
│  (Multi-Asset Coordinator)      │
│  - strategyOf[asset] mapping    │
│  - harvestAll()                 │
│  - depositERC20()               │
│  - withdrawERC20()              │
│  - reallocate()                 │
└───────┬─────────────────────────┘
        │
        ├─────────────────┬─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│YieldStrategy │  │YieldStrategy │  │YieldStrategy │
│   (USDC)     │  │   (USDT)     │  │   (DAI)      │
│              │  │              │  │              │
│- Per-user    │  │- Per-user    │  │- Per-user    │
│  yield       │  │  yield       │  │  yield       │
│- report()    │  │- report()    │  │- report()    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   YieldVault     │
              │  (ERC-4626)      │
              │                  │
              │- Aave integration│
              │- Performance fees│
              │- Auto-supply     │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Aave V3 Pool   │
              │  (Yield Source)  │
              └──────────────────┘

┌─────────────────┐
│YieldDistributor │
│- Recipients     │
│- distribute()   │
└─────────────────┘
```

---

## 🚀 Setup & Deployment

### Prerequisites

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

### Environment Variables

```bash
export PRIVATE_KEY=your_private_key
export OPERATOR=your_ai_agent_wallet_address
export BASE_MAINNET_RPC_URL=your_base_rpc_url
export ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deployment

```bash
forge script script/DeployCompleteSystem.s.sol:DeployCompleteSystem \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

---

## 📝 License

MIT
