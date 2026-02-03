// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {YieldDistributor} from "../src/core/YieldDistributor.sol";

/// @title ManageRecipients
/// @notice Script to manage recipient addresses in YieldDistributor
contract ManageRecipients is Script {
    // Set this address after deployment
    address constant DISTRIBUTOR_ADDRESS = address(0); // Set after deployment

    function run() external {
        uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(adminPrivateKey);

        require(DISTRIBUTOR_ADDRESS != address(0), "Set DISTRIBUTOR_ADDRESS constant");

        YieldDistributor distributor = YieldDistributor(DISTRIBUTOR_ADDRESS);

        vm.startBroadcast(adminPrivateKey);

        console2.log("Admin:", admin);
        console2.log("Distributor:", address(distributor));

        // Example operations - uncomment the one you want to perform

        // Option 1: Add a new recipient
        // address newRecipient = address(0x...);
        // distributor.addRecipient(newRecipient);
        // console2.log("Added recipient:", newRecipient);

        // Option 2: Remove a recipient
        // address recipientToRemove = address(0x...);
        // distributor.removeRecipient(recipientToRemove);
        // console2.log("Removed recipient:", recipientToRemove);

        // Option 3: Set all recipients at once (replaces entire list)
        // address[] memory newRecipients = new address[](3);
        // newRecipients[0] = address(0x...);
        // newRecipients[1] = address(0x...);
        // newRecipients[2] = address(0x...);
        // distributor.setRecipients(newRecipients);
        // console2.log("Set", newRecipients.length, "recipients");

        // View current recipients
        console2.log("\n=== Current Recipients ===");
        address[] memory currentRecipients = distributor.getRecipients();
        console2.log("Total recipients:", currentRecipients.length);
        for (uint256 i = 0; i < currentRecipients.length; i++) {
            console2.log("Recipient", i, ":", currentRecipients[i]);
        }

        vm.stopBroadcast();
    }
}
