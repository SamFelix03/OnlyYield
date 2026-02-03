// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {YieldVault} from "../src/core/YieldVault.sol";
import {YieldStrategy} from "../src/core/YieldStrategy.sol";
import {YieldOrchestrator} from "../src/core/YieldOrchestrator.sol";
import {YieldDistributor} from "../src/core/YieldDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title InteractWithSystem
/// @notice Script to perform complete flow: deposit, supply, harvest, distribute
contract InteractWithSystem is Script {
    // Set these addresses after deployment
    address constant VAULT_ADDRESS = address(0); // Set after deployment
    address constant STRATEGY_ADDRESS = address(0); // Set after deployment
    address constant ORCHESTRATOR_ADDRESS = address(0); // Set after deployment
    address constant DISTRIBUTOR_ADDRESS = address(0); // Set after deployment
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 operatorPrivateKey = vm.envUint("PRIVATE_KEY");
        address operator = vm.addr(operatorPrivateKey);

        require(VAULT_ADDRESS != address(0), "Set VAULT_ADDRESS constant");
        require(STRATEGY_ADDRESS != address(0), "Set STRATEGY_ADDRESS constant");
        require(ORCHESTRATOR_ADDRESS != address(0), "Set ORCHESTRATOR_ADDRESS constant");

        YieldVault vault = YieldVault(VAULT_ADDRESS);
        YieldStrategy strategy = YieldStrategy(STRATEGY_ADDRESS);
        YieldOrchestrator orchestrator = YieldOrchestrator(ORCHESTRATOR_ADDRESS);
        IERC20 usdc = IERC20(USDC_SEPOLIA);

        vm.startBroadcast(operatorPrivateKey);

        console2.log("Operator:", operator);
        console2.log("Vault:", address(vault));
        console2.log("Strategy:", address(strategy));

        // Step 1: Check USDC balance
        uint256 usdcBalance = usdc.balanceOf(operator);
        console2.log("\n=== Step 1: Check Balance ===");
        console2.log("Operator USDC balance:", usdcBalance / 1e6, "USDC");

        if (usdcBalance == 0) {
            console2.log("ERROR: No USDC balance. Please fund the operator address.");
            vm.stopBroadcast();
            return;
        }

        // Step 2: Approve orchestrator to spend USDC
        console2.log("\n=== Step 2: Approve Orchestrator ===");
        usdc.approve(address(orchestrator), type(uint256).max);
        console2.log("Approved orchestrator to spend USDC");

        // Step 3: Deposit USDC via orchestrator into strategy
        uint256 depositAmount = usdcBalance; // Deposit all USDC
        console2.log("\n=== Step 3: Deposit via Orchestrator ===");
        console2.log("Depositing:", depositAmount / 1e6, "USDC");
        
        uint256 shares = orchestrator.depositERC20(
            operator, // from
            USDC_SEPOLIA, // inputAsset
            depositAmount, // amountIn
            USDC_SEPOLIA, // targetAsset
            0, // minAmountOut (no swap needed)
            operator // receiver
        );
        console2.log("Received strategy shares:", shares);
        console2.log("Strategy total assets:", strategy.totalAssets() / 1e6, "USDC");

        // Step 4: Supply deposited USDC to Aave via vault
        console2.log("\n=== Step 4: Supply to Aave ===");
        uint256 idleBefore = vault.idleUnderlying();
        console2.log("Idle USDC before supply:", idleBefore / 1e6, "USDC");
        
        vault.supplyToAave(idleBefore);
        console2.log("Supplied to Aave");
        
        uint256 aTokenBalance = vault.aTokenBalance();
        console2.log("aToken balance:", aTokenBalance / 1e6, "aUSDC");
        console2.log("Idle USDC after supply:", vault.idleUnderlying() / 1e6, "USDC");

        // Step 5: Initial checkpoint in vault
        console2.log("\n=== Step 5: Initial Checkpoint ===");
        vault.checkpoint();
        console2.log("Checkpoint created");
        console2.log("Last checkpoint assets:", vault.lastCheckpointAssets() / 1e6, "USDC");

        // Step 6: Initial report in strategy (sets baseline)
        console2.log("\n=== Step 6: Initial Strategy Report ===");
        (uint256 profit, uint256 loss) = strategy.report();
        console2.log("Initial report - profit:", profit / 1e6, "USDC, loss:", loss / 1e6, "USDC");

        // Step 7: Wait for yield (simulated by time travel or wait for real time)
        console2.log("\n=== Step 7: Waiting for Yield ===");
        console2.log("NOTE: In production, wait for actual time to pass for Aave to accrue yield.");
        console2.log("For testing, you can use vm.warp() to advance time.");
        
        // Uncomment to simulate time passage (for testing only)
        // vm.warp(block.timestamp + 7 days);
        // console2.log("Advanced time by 7 days");

        // Step 8: Harvest yield (report profit and distribute)
        console2.log("\n=== Step 8: Harvest Yield ===");
        console2.log("Reporting profit and distributing to recipients...");
        (profit, loss) = orchestrator.harvestStrategy(address(strategy));
        console2.log("Harvested - profit:", profit / 1e6, "USDC, loss:", loss / 1e6, "USDC");

        if (profit > 0) {
            console2.log("Yield distributed to recipients via YieldDistributor");
        } else {
            console2.log("No yield available yet. Wait longer or check Aave rates.");
        }

        // Step 9: Check recipient balances (if distributor address is set)
        if (DISTRIBUTOR_ADDRESS != address(0)) {
            console2.log("\n=== Step 9: Check Recipient Balances ===");
            YieldDistributor distributor = YieldDistributor(DISTRIBUTOR_ADDRESS);
            address[] memory recs = distributor.getRecipients();
            for (uint256 i = 0; i < recs.length; i++) {
                uint256 bal = usdc.balanceOf(recs[i]);
                console2.log("Recipient", i, "(", recs[i], "):", bal / 1e6, "USDC");
            }
        }

        // Step 10: Final status
        console2.log("\n=== Step 10: Final Status ===");
        console2.log("Vault total assets:", vault.totalAssets() / 1e6, "USDC");
        console2.log("Vault aToken balance:", vault.aTokenBalance() / 1e6, "aUSDC");
        console2.log("Strategy total assets:", strategy.totalAssets() / 1e6, "USDC");
        console2.log("Operator strategy shares:", strategy.balanceOf(operator));
        console2.log("Operator share value:", (strategy.balanceOf(operator) * strategy.totalAssets() / strategy.totalSupply()) / 1e6, "USDC");

        vm.stopBroadcast();

        console2.log("\n=== Flow Complete ===");
    }
}
