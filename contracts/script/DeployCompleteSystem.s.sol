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

/// @title DeployCompleteSystem
/// @notice Deployment script for complete yield streaming system on Base Sepolia
contract DeployCompleteSystem is Script {
    // Addresses loaded from environment variables
    address USDC_BASE_SEPOLIA;
    address AUSDC_BASE_SEPOLIA;
    address AAVE_POOL_BASE_SEPOLIA;
    address UNISWAP_V3_ROUTER_BASE_SEPOLIA;
    uint24 constant DEFAULT_POOL_FEE = 3000; // 0.3%

    // Initial recipient addresses (loaded from environment or defaults)
    address[] recipients;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address operator = vm.envOr("OPERATOR", deployer); // AI agent wallet

        // Load addresses from environment variables
        USDC_BASE_SEPOLIA = vm.envAddress("USDC_ADDRESS");
        AUSDC_BASE_SEPOLIA = vm.envAddress("AUSDC_ADDRESS");
        AAVE_POOL_BASE_SEPOLIA = vm.envAddress("AAVE_POOL_ADDRESS");
        UNISWAP_V3_ROUTER_BASE_SEPOLIA = vm.envAddress("UNISWAP_V3_ROUTER_ADDRESS");

        // Load recipients from environment or use defaults
        address recipient1 = vm.envOr("RECIPIENT_1", address(0x0d8cE3C60C17f71171C5bAC1B40C05937b873711));
        address recipient2 = vm.envOr("RECIPIENT_2", address(0xF08936cA98E0a97F24c5D997Db2252ae6aCCaa21));
        address recipient3 = vm.envOr("RECIPIENT_3", address(0x0994b358dC0a58Dd2bD3cc222ef8ab6F1eB7BFEb));
        
        recipients.push(recipient1);
        recipients.push(recipient2);
        recipients.push(recipient3);

        console2.log("Deploying from:", deployer);
        console2.log("Operator (AI agent):", operator);
        console2.log("Deployer balance:", deployer.balance / 1e18, "ETH");
        console2.log("Recipients:", recipient1, recipient2, recipient3);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy YieldDistributor
        console2.log("\n=== Step 1: Deploying YieldDistributor ===");
        YieldDistributor distributor = new YieldDistributor(deployer, recipients);
        console2.log("YieldDistributor deployed at:", address(distributor));
        console2.log("Recipients count:", distributor.recipientCount());

        // Step 2: Deploy YieldVault
        console2.log("\n=== Step 2: Deploying YieldVault ===");
        YieldVault vault = new YieldVault(
            IERC20(USDC_BASE_SEPOLIA),
            IERC20(AUSDC_BASE_SEPOLIA),
            deployer, // treasury (can be changed later)
            1000, // 10% fee (1000 bps)
            IAaveV3Pool(AAVE_POOL_BASE_SEPOLIA),
            deployer
        );
        console2.log("YieldVault deployed at:", address(vault));

        // Step 3: Deploy YieldStrategy
        console2.log("\n=== Step 3: Deploying YieldStrategy ===");
        YieldStrategy strategy = new YieldStrategy(
            USDC_BASE_SEPOLIA,
            "Yield USDC Strategy",
            "yUSDC",
            address(vault),
            deployer
        );
        console2.log("YieldStrategy deployed at:", address(strategy));

        // Step 4: Configure vault to allow strategy deposits
        console2.log("\n=== Step 4: Configuring Vault ===");
        vault.addStrategy(address(strategy));
        console2.log("Strategy added to vault");

        // Step 5: Deploy YieldOrchestrator
        console2.log("\n=== Step 5: Deploying YieldOrchestrator ===");
        YieldOrchestrator orchestrator = new YieldOrchestrator(
            deployer,
            operator,
            UNISWAP_V3_ROUTER_BASE_SEPOLIA,
            DEFAULT_POOL_FEE
        );
        console2.log("YieldOrchestrator deployed at:", address(orchestrator));

        // Step 6: Register strategy in orchestrator
        console2.log("\n=== Step 6: Registering Strategy ===");
        orchestrator.setStrategy(USDC_BASE_SEPOLIA, address(strategy));
        console2.log("Strategy registered in orchestrator");

        // Step 7: Deploy YieldReallocator
        console2.log("\n=== Step 7: Deploying YieldReallocator ===");
        YieldReallocator reallocator = new YieldReallocator(deployer, operator);
        console2.log("YieldReallocator deployed at:", address(reallocator));

        // Step 8: Grant operator role to orchestrator and reallocator in strategy
        console2.log("\n=== Step 8: Granting Roles ===");
        strategy.addOperator(address(orchestrator));
        strategy.addOperator(address(reallocator));
        console2.log("Orchestrator and Reallocator granted operator role in strategy");

        // Grant operator role in vault
        vault.addOperator(address(orchestrator));
        vault.addOperator(operator);
        console2.log("Orchestrator and operator granted operator role in vault");

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("YieldVault:", address(vault));
        console2.log("YieldDistributor:", address(distributor));
        console2.log("YieldStrategy:", address(strategy));
        console2.log("YieldOrchestrator:", address(orchestrator));
        console2.log("YieldReallocator:", address(reallocator));
        console2.log("\n=== Next Steps ===");
        console2.log("1. Fund operator wallet with USDC");
        console2.log("2. Use InteractWithSystem.s.sol to perform operations");
        console2.log("3. Recipients can be updated via distributor.setRecipients()");
    }
}
