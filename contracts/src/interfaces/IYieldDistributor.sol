// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IYieldDistributor
/// @notice Interface for yield distribution contracts
interface IYieldDistributor {
    /// @notice Distribute tokens equally among recipients
    /// @param token Token to distribute
    /// @param totalAmount Total amount to distribute
    function distribute(address token, uint256 totalAmount) external;
}
