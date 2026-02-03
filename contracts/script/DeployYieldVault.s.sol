// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {YieldVault} from "../src/core/YieldVault.sol";
import {YieldDistributor} from "../src/core/YieldDistributor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAaveV3Pool} from "../src/interfaces/IAaveV3Pool.sol";

/// @title DeployYieldVault
/// @notice Deployment script for YieldVault and YieldDistributor on Ethereum Sepolia
/// @dev This is a simplified deployment. Use DeployCompleteSystem.s.sol for full system deployment.
contract DeployYieldVault is Script {
    // Ethereum Sepolia addresses
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // USDC on Sepolia
    address constant AUSDC_SEPOLIA = 0x16dA4541aD1807f4443d92D26044C1147406EB80; // aUSDC on Sepolia
    address constant AAVE_POOL_SEPOLIA = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951; // Aave Pool on Sepolia

    // Initial recipient addresses (can be changed later via setRecipients)
    address[] recipients = [
        0x4BaF3334dF86FB791A6DF6Cf4210C685ab6A1766, // Recipient 1
        0x82657beC713AbA72A68D3cD903BE5930CC45dec3, // Recipient 2
        0xA0B0Bf2D837E87d2f4338bFa579bFACd1133cFBd  // Recipient 3
    ];

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying from:", deployer);
        console2.log("Deployer balance:", deployer.balance / 1e18, "ETH");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy YieldDistributor first
        console2.log("\n=== Deploying YieldDistributor ===");
        YieldDistributor distributor = new YieldDistributor(deployer, recipients);
        console2.log("YieldDistributor deployed at:", address(distributor));
        console2.log("Recipients count:", distributor.recipientCount());

        // Deploy YieldVault
        console2.log("\n=== Deploying YieldVault ===");
        YieldVault vault = new YieldVault(
            IERC20(USDC_SEPOLIA),
            IERC20(AUSDC_SEPOLIA),
            deployer, // treasury
            1000, // 10% fee (1000 bps)
            IAaveV3Pool(AAVE_POOL_SEPOLIA),
            deployer
        );
        console2.log("YieldVault deployed at:", address(vault));

        // Verify setup
        console2.log("\n=== Verification ===");
        console2.log("Vault asset:", address(vault.asset()));
        console2.log("Vault aToken:", address(vault.A_TOKEN()));
        console2.log("Vault aavePool:", address(vault.aavePool()));

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("YieldVault:", address(vault));
        console2.log("YieldDistributor:", address(distributor));
        console2.log("\nNote: Recipients can be updated later using distributor.setRecipients()");
    }
}
