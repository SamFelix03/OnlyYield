// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {YieldVault} from "../src/core/YieldVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title InteractWithVault
/// @notice Script to perform the complete flow: deposit USDC, supply to Aave, wait for yield, distribute
contract InteractWithVault is Script {
    // Set these addresses after deployment
    address constant VAULT_ADDRESS = address(0); // Set after deployment
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        uint256 operatorPrivateKey = vm.envUint("PRIVATE_KEY");
        address operator = vm.addr(operatorPrivateKey);

        require(VAULT_ADDRESS != address(0), "Set VAULT_ADDRESS constant");

        YieldVault vault = YieldVault(VAULT_ADDRESS);
        IERC20 usdc = IERC20(USDC_SEPOLIA);

        vm.startBroadcast(operatorPrivateKey);

        console2.log("Operator:", operator);
        console2.log("Vault:", address(vault));

        // Step 1: Check USDC balance
        uint256 usdcBalance = usdc.balanceOf(operator);
        console2.log("\n=== Step 1: Check Balance ===");
        console2.log("Operator USDC balance:", usdcBalance / 1e6, "USDC");

        if (usdcBalance == 0) {
            console2.log("ERROR: No USDC balance. Please fund the operator address.");
            vm.stopBroadcast();
            return;
        }

        // Step 2: Approve vault to spend USDC
        console2.log("\n=== Step 2: Approve Vault ===");
        usdc.approve(address(vault), type(uint256).max);
        console2.log("Approved vault to spend USDC");

        // Step 3: Deposit USDC into vault
        uint256 depositAmount = usdcBalance; // Deposit all USDC
        console2.log("\n=== Step 3: Deposit USDC ===");
        console2.log("Depositing:", depositAmount / 1e6, "USDC");
        uint256 shares = vault.deposit(depositAmount, operator);
        console2.log("Received shares:", shares);
        console2.log("Vault total assets:", vault.totalAssets() / 1e6, "USDC");

        // Step 4: Supply deposited USDC to Aave
        console2.log("\n=== Step 4: Supply to Aave ===");
        uint256 idleBefore = vault.idleUnderlying();
        console2.log("Idle USDC before supply:", idleBefore / 1e6, "USDC");
        
        vault.supplyToAave(idleBefore);
        console2.log("Supplied to Aave");
        
        uint256 aTokenBalance = vault.aTokenBalance();
        console2.log("aToken balance:", aTokenBalance / 1e6, "aUSDC");
        console2.log("Idle USDC after supply:", vault.idleUnderlying() / 1e6, "USDC");

        // Step 5: Initial checkpoint
        console2.log("\n=== Step 5: Initial Checkpoint ===");
        vault.checkpoint();
        console2.log("Checkpoint created");
        console2.log("Last checkpoint assets:", vault.lastCheckpointAssets() / 1e6, "USDC");

        // Step 6: Wait for yield (simulated by time travel or wait for real time)
        console2.log("\n=== Step 6: Waiting for Yield ===");
        console2.log("NOTE: In production, wait for actual time to pass for Aave to accrue yield.");
        console2.log("For testing, you can use vm.warp() to advance time.");
        
        // Uncomment to simulate time passage (for testing only)
        // vm.warp(block.timestamp + 7 days);
        // console2.log("Advanced time by 7 days");

        // Step 7: Check pending yield
        console2.log("\n=== Step 7: Check Pending Yield ===");
        uint256 pendingYield = vault.pendingYield();
        console2.log("Pending yield:", pendingYield / 1e6, "USDC");
        
        if (pendingYield == 0) {
            console2.log("No yield available yet. Wait longer or check Aave rates.");
        } else {
            // Step 8: Distribute yield
            console2.log("\n=== Step 8: Distribute Yield ===");
            console2.log("Distributing yield to recipients...");
            vault.distributeYield();
            console2.log("Yield distributed successfully");
            console2.log("New checkpoint assets:", vault.lastCheckpointAssets() / 1e6, "USDC");
        }

        // Step 9: Final status
        console2.log("\n=== Step 9: Final Status ===");
        console2.log("Vault total assets:", vault.totalAssets() / 1e6, "USDC");
        console2.log("Vault aToken balance:", vault.aTokenBalance() / 1e6, "aUSDC");
        console2.log("Vault idle USDC:", vault.idleUnderlying() / 1e6, "USDC");
        console2.log("Operator vault shares:", vault.balanceOf(operator));
        console2.log("Operator share value:", vault.convertToAssets(vault.balanceOf(operator)) / 1e6, "USDC");

        vm.stopBroadcast();

        console2.log("\n=== Flow Complete ===");
    }
}
