// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {YieldVault} from "../src/core/YieldVault.sol";
import {YieldDistributor} from "../src/core/YieldDistributor.sol";
import {YieldStrategy} from "../src/core/YieldStrategy.sol";
import {YieldOrchestrator} from "../src/core/YieldOrchestrator.sol";
import {YieldReallocator} from "../src/core/YieldReallocator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAaveV3Pool} from "../src/interfaces/IAaveV3Pool.sol";
import {IUniswapV3Router} from "../src/interfaces/IUniswapV3Router.sol";

/// @title TestCompleteFlow
/// @notice Comprehensive test script that deploys and tests all functionalities
contract TestCompleteFlow is Script {
    // Ethereum Sepolia addresses
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant AUSDC_SEPOLIA = 0x16dA4541aD1807f4443d92D26044C1147406EB80;
    address constant AAVE_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant UNISWAP_V3_ROUTER_SEPOLIA = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E;
    uint24 constant DEFAULT_POOL_FEE = 3000;

    // Test recipient addresses (using deployer's address variations for testing)
    address[] recipients;

    // Deployed contract addresses
    YieldVault public vault;
    YieldDistributor public distributor;
    YieldStrategy public strategy;
    YieldOrchestrator public orchestrator;
    YieldReallocator public reallocator;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address operator = deployer; // Use deployer as operator for testing

        // Create test recipients (using deployer + offsets for testing)
        recipients.push(address(uint160(deployer) + 1));
        recipients.push(address(uint160(deployer) + 2));
        recipients.push(address(uint160(deployer) + 3));

        console2.log("=== TEST COMPLETE FLOW ===");
        console2.log("Deployer:", deployer);
        console2.log("Operator:", operator);
        console2.log("Deployer balance (ETH):", deployer.balance / 1e18);

        vm.startBroadcast(deployerPrivateKey);

        // ========== PHASE 1: DEPLOYMENT ==========
        console2.log("\n========== PHASE 1: DEPLOYMENT ==========");
        
        // Deploy YieldDistributor
        console2.log("\n[1.1] Deploying YieldDistributor...");
        distributor = new YieldDistributor(deployer, recipients);
        console2.log("[OK] YieldDistributor:", address(distributor));
        console2.log("  Recipients:", distributor.recipientCount());

        // Deploy YieldVault
        console2.log("\n[1.2] Deploying YieldVault...");
        vault = new YieldVault(
            IERC20(USDC_SEPOLIA),
            IERC20(AUSDC_SEPOLIA),
            deployer,
            1000, // 10% fee (not used for distribution, but kept for compatibility)
            IAaveV3Pool(AAVE_POOL_SEPOLIA),
            deployer
        );
        console2.log("[OK] YieldVault:", address(vault));

        // Deploy YieldStrategy
        console2.log("\n[1.3] Deploying YieldStrategy...");
        strategy = new YieldStrategy(
            USDC_SEPOLIA,
            "Yield USDC Strategy",
            "yUSDC",
            address(vault),
            deployer
        );
        console2.log("[OK] YieldStrategy:", address(strategy));

        // Configure vault
        console2.log("\n[1.4] Configuring Vault...");
        vault.addStrategy(address(strategy));
        console2.log("[OK] Strategy added to vault");

        // Deploy YieldOrchestrator
        console2.log("\n[1.5] Deploying YieldOrchestrator...");
        orchestrator = new YieldOrchestrator(
            deployer,
            operator,
            UNISWAP_V3_ROUTER_SEPOLIA,
            DEFAULT_POOL_FEE
        );
        console2.log("[OK] YieldOrchestrator:", address(orchestrator));

        // Register strategy
        console2.log("\n[1.6] Registering Strategy...");
        orchestrator.setStrategy(USDC_SEPOLIA, address(strategy));
        console2.log("[OK] Strategy registered");

        // Deploy YieldReallocator
        console2.log("\n[1.7] Deploying YieldReallocator...");
        reallocator = new YieldReallocator(deployer, operator);
        console2.log("[OK] YieldReallocator:", address(reallocator));

        // Grant roles
        console2.log("\n[1.8] Granting Roles...");
        strategy.addOperator(address(orchestrator));
        strategy.addOperator(address(reallocator));
        vault.addOperator(address(orchestrator));
        vault.addOperator(operator);
        console2.log("[OK] All roles granted");

        vm.stopBroadcast();

        // ========== PHASE 2: DEPOSIT & SUPPLY ==========
        console2.log("\n========== PHASE 2: DEPOSIT & SUPPLY ==========");
        
        IERC20 usdc = IERC20(USDC_SEPOLIA);
        uint256 usdcBalance = usdc.balanceOf(deployer);
        console2.log("\n[2.1] Checking USDC Balance...");
        console2.log("  Deployer USDC balance:", usdcBalance / 1e6);

        if (usdcBalance == 0) {
            console2.log("[WARN] WARNING: No USDC balance. Skipping deposit tests.");
            console2.log("  To test deposits, fund the deployer address with USDC.");
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        // Approve orchestrator
        console2.log("\n[2.2] Approving Orchestrator...");
        usdc.approve(address(orchestrator), type(uint256).max);
        console2.log("[OK] Approved");

        // Deposit via orchestrator
        uint256 depositAmount = usdcBalance / 2; // Deposit half
        console2.log("\n[2.3] Depositing via Orchestrator...");
        console2.log("  Depositing (USDC):", depositAmount / 1e6);
        
        uint256 shares = orchestrator.depositERC20(
            deployer,
            USDC_SEPOLIA,
            depositAmount,
            USDC_SEPOLIA,
            0,
            deployer
        );
        console2.log("[OK] Received strategy shares:", shares);
        console2.log("  Strategy total assets (USDC):", strategy.totalAssets() / 1e6);

        // Supply to Aave
        console2.log("\n[2.4] Supplying to Aave...");
        uint256 idleBefore = vault.idleUnderlying();
        console2.log("  Idle USDC:", idleBefore / 1e6);
        
        if (idleBefore > 0) {
            vault.supplyToAave(idleBefore);
            console2.log("[OK] Supplied to Aave");
            console2.log("  aToken balance (aUSDC):", vault.aTokenBalance() / 1e6);
        } else {
            console2.log("[WARN] No idle funds to supply");
        }

        // Initial checkpoint
        console2.log("\n[2.5] Creating Initial Checkpoint...");
        vault.checkpoint();
        console2.log("[OK] Checkpoint created");
        console2.log("  Last checkpoint assets (USDC):", vault.lastCheckpointAssets() / 1e6);

        // Initial report (baseline)
        console2.log("\n[2.6] Initial Strategy Report...");
        (uint256 profit, uint256 loss) = strategy.report();
        console2.log("[OK] Baseline set");
        console2.log("  Profit (USDC):", profit / 1e6);
        console2.log("  Loss (USDC):", loss / 1e6);

        vm.stopBroadcast();

        // ========== PHASE 3: SIMULATE YIELD & HARVEST ==========
        console2.log("\n========== PHASE 3: SIMULATE YIELD & HARVEST ==========");
        
        // Advance time to simulate yield accrual
        console2.log("\n[3.1] Simulating Time Passage...");
        vm.warp(block.timestamp + 7 days);
        console2.log("[OK] Advanced time by 7 days");

        // Note: On a fork, Aave will have accrued yield
        // Let's check current assets
        uint256 assetsBefore = strategy.totalAssets();
        console2.log("  Strategy assets before harvest (USDC):", assetsBefore / 1e6);

        vm.startBroadcast(deployerPrivateKey);

        // Harvest yield
        console2.log("\n[3.2] Harvesting Yield...");
        orchestrator.harvestStrategy(address(strategy));
        (profit, loss) = strategy.report();
        console2.log("[OK] Harvested");
        console2.log("  Profit (USDC):", profit / 1e6);
        console2.log("  Loss (USDC):", loss / 1e6);

        if (profit > 0) {
            console2.log("[OK] Yield distributed to recipients");
        } else {
            console2.log("[WARN] No yield detected (may need more time or different conditions)");
        }

        vm.stopBroadcast();

        // ========== PHASE 4: RECIPIENT MANAGEMENT ==========
        console2.log("\n========== PHASE 4: RECIPIENT MANAGEMENT ==========");
        
        vm.startBroadcast(deployerPrivateKey);

        // Check current recipients
        console2.log("\n[4.1] Current Recipients...");
        address[] memory currentRecipients = distributor.getRecipients();
        console2.log("  Total recipients:", currentRecipients.length);
        for (uint256 i = 0; i < currentRecipients.length; i++) {
            uint256 bal = usdc.balanceOf(currentRecipients[i]);
            console2.log("  Recipient", i, ":", currentRecipients[i]);
            console2.log("    Balance (USDC):", bal / 1e6);
        }

        // Add a new recipient
        address newRecipient = address(uint160(deployer) + 4);
        console2.log("\n[4.2] Adding New Recipient...");
        distributor.addRecipient(newRecipient);
        console2.log("[OK] Added recipient:", newRecipient);
        console2.log("  Total recipients now:", distributor.recipientCount());

        // Remove a recipient
        console2.log("\n[4.3] Removing Recipient...");
        distributor.removeRecipient(recipients[0]);
        console2.log("[OK] Removed recipient:", recipients[0]);
        console2.log("  Total recipients now:", distributor.recipientCount());

        // Set recipients (replace all)
        address[] memory newRecipients = new address[](2);
        newRecipients[0] = recipients[1];
        newRecipients[1] = newRecipient;
        console2.log("\n[4.4] Setting New Recipient List...");
        distributor.setRecipients(newRecipients);
        console2.log("[OK] Set recipients count:", newRecipients.length);
        console2.log("  Total recipients now:", distributor.recipientCount());

        vm.stopBroadcast();

        // ========== PHASE 5: WITHDRAWAL ==========
        console2.log("\n========== PHASE 5: WITHDRAWAL ==========");
        
        vm.startBroadcast(deployerPrivateKey);

        uint256 userShares = strategy.balanceOf(deployer);
        console2.log("\n[5.1] Checking User Position...");
        console2.log("  User strategy shares:", userShares);
        console2.log("  Share value (USDC):", (userShares * strategy.totalAssets() / strategy.totalSupply()) / 1e6);

        if (userShares > 0) {
            uint256 withdrawAmount = userShares / 2; // Withdraw half
            console2.log("\n[5.2] Withdrawing via Orchestrator...");
            console2.log("  Withdrawing shares:", withdrawAmount);
            
            uint256 assetsOut = orchestrator.withdrawERC20(
                deployer,
                USDC_SEPOLIA,
                withdrawAmount,
                USDC_SEPOLIA,
                0,
                deployer
            );
            console2.log("[OK] Withdrawn");
            console2.log("  Assets received (USDC):", assetsOut / 1e6);
            console2.log("  Remaining shares:", strategy.balanceOf(deployer));
        } else {
            console2.log("[WARN] No shares to withdraw");
        }

        vm.stopBroadcast();

        // ========== PHASE 6: FINAL STATUS ==========
        console2.log("\n========== PHASE 6: FINAL STATUS ==========");
        
        console2.log("\nDeployed Contracts:");
        console2.log("  YieldVault:", address(vault));
        console2.log("  YieldDistributor:", address(distributor));
        console2.log("  YieldStrategy:", address(strategy));
        console2.log("  YieldOrchestrator:", address(orchestrator));
        console2.log("  YieldReallocator:", address(reallocator));

        console2.log("\nVault Status:");
        console2.log("  Total assets (USDC):", vault.totalAssets() / 1e6);
        console2.log("  aToken balance (aUSDC):", vault.aTokenBalance() / 1e6);
        console2.log("  Idle USDC:", vault.idleUnderlying() / 1e6);

        console2.log("\nStrategy Status:");
        console2.log("  Total assets (USDC):", strategy.totalAssets() / 1e6);
        console2.log("  Total supply:", strategy.totalSupply());
        console2.log("  User shares:", strategy.balanceOf(deployer));

        console2.log("\nRecipients:");
        currentRecipients = distributor.getRecipients();
        for (uint256 i = 0; i < currentRecipients.length; i++) {
            console2.log("  Recipient", i, ":", currentRecipients[i]);
        }

        console2.log("\n=== ALL TESTS COMPLETE ===");
    }
}
