// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title YieldDistributor
/// @notice Distributes yield equally among dynamically configurable recipient addresses
contract YieldDistributor is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State ---
    address[] public recipients;
    mapping(address => bool) public isRecipient;

    // --- Events ---
    event RecipientAdded(address indexed recipient);
    event RecipientRemoved(address indexed recipient);
    event RecipientsSet(address[] recipients);
    event YieldDistributed(address indexed token, uint256 totalAmount, uint256 perRecipient, uint256 recipientCount);
    event DistributionFailed(address indexed recipient, uint256 amount, string reason);

    /// @notice Constructor
    /// @param admin Admin address
    /// @param initialRecipients Array of initial recipient addresses
    constructor(address admin, address[] memory initialRecipients) {
        require(admin != address(0), "admin=0");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        for (uint256 i = 0; i < initialRecipients.length; i++) {
            require(initialRecipients[i] != address(0), "recipient=0");
            require(!isRecipient[initialRecipients[i]], "duplicate recipient");
            recipients.push(initialRecipients[i]);
            isRecipient[initialRecipients[i]] = true;
            emit RecipientAdded(initialRecipients[i]);
        }
    }

    /// @notice Add a new recipient
    /// @param recipient Address to add
    function addRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "recipient=0");
        require(!isRecipient[recipient], "already recipient");
        recipients.push(recipient);
        isRecipient[recipient] = true;
        emit RecipientAdded(recipient);
    }

    /// @notice Remove a recipient
    /// @param recipient Address to remove
    function removeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isRecipient[recipient], "not recipient");
        isRecipient[recipient] = false;

        // Remove from array
        uint256 length = recipients.length;
        for (uint256 i = 0; i < length; i++) {
            if (recipients[i] == recipient) {
                recipients[i] = recipients[length - 1];
                recipients.pop();
                emit RecipientRemoved(recipient);
                return;
            }
        }
    }

    /// @notice Set all recipients at once (replaces existing list)
    /// @param newRecipients Array of recipient addresses to set
    function setRecipients(address[] calldata newRecipients) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipients.length > 0, "no recipients");

        // Clear existing recipients
        uint256 oldLength = recipients.length;
        for (uint256 i = 0; i < oldLength; i++) {
            isRecipient[recipients[i]] = false;
            emit RecipientRemoved(recipients[i]);
        }
        delete recipients;

        // Add new recipients
        for (uint256 i = 0; i < newRecipients.length; i++) {
            require(newRecipients[i] != address(0), "recipient=0");
            require(!isRecipient[newRecipients[i]], "duplicate recipient");
            recipients.push(newRecipients[i]);
            isRecipient[newRecipients[i]] = true;
            emit RecipientAdded(newRecipients[i]);
        }

        emit RecipientsSet(newRecipients);
    }

    /// @notice Distribute tokens equally among all active recipients
    /// @param token Token to distribute
    /// @param totalAmount Total amount to distribute
    function distribute(address token, uint256 totalAmount) external nonReentrant {
        require(token != address(0), "token=0");
        require(totalAmount > 0, "amount=0");
        require(recipients.length > 0, "no recipients");

        uint256 numRecipients = recipients.length;
        uint256 perRecipient = totalAmount / numRecipients;
        uint256 remainder = totalAmount % numRecipients;

        require(perRecipient > 0, "amount too small");

        IERC20 tokenContract = IERC20(token);
        uint256 distributed = 0;

        // Distribute equal amounts to all active recipients
        for (uint256 i = 0; i < numRecipients; i++) {
            if (isRecipient[recipients[i]]) {
                tokenContract.safeTransfer(recipients[i], perRecipient);
                distributed += perRecipient;
            }
        }

        // Distribute remainder to first active recipient if any
        if (remainder > 0 && isRecipient[recipients[0]]) {
            tokenContract.safeTransfer(recipients[0], remainder);
            distributed += remainder;
        }

        // Return any undistributed tokens to sender
        uint256 balance = tokenContract.balanceOf(address(this));
        if (balance > 0) {
            tokenContract.safeTransfer(msg.sender, balance);
        }

        emit YieldDistributed(token, totalAmount, perRecipient, numRecipients);
    }

    /// @notice Get number of recipients
    /// @return Number of recipients
    function recipientCount() external view returns (uint256) {
        return recipients.length;
    }

    /// @notice Get all recipients
    /// @return Array of recipient addresses
    function getRecipients() external view returns (address[] memory) {
        return recipients;
    }
}
