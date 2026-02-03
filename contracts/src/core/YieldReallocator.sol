// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";
import {IStrategyPermit} from "../interfaces/IStrategyPermit.sol";

/// @title YieldReallocator
/// @notice Orchestrates user-approved migrations between yield strategies with optional off-chain swap aggregator
contract YieldReallocator is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Whitelisted swap aggregators
    mapping(address => bool) public isAggregator;

    // Events
    event AggregatorUpdated(address indexed aggregator, bool allowed);
    event StrategyMigrated(
        address indexed owner,
        address indexed sourceStrategy,
        address indexed targetStrategy,
        uint256 sharesIn,
        uint256 assetsFrom,
        uint256 assetsTo,
        uint256 targetSharesOut
    );

    /// @notice Constructor
    /// @param admin Admin address
    /// @param operator Operator address
    constructor(address admin, address operator) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /// @notice Set aggregator whitelist status
    /// @param aggregator Aggregator address
    /// @param allowed Whether allowed
    function setAggregator(address aggregator, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAggregator[aggregator] = allowed;
        emit AggregatorUpdated(aggregator, allowed);
    }

    /// @notice Migrate between yield strategies with optional swap via aggregator
    /// @param owner Share owner (and receiver of new target shares)
    /// @param sourceStrategy Source yield strategy
    /// @param targetStrategy Target yield strategy
    /// @param shares Number of source strategy shares to migrate
    /// @param aggregator Whitelisted aggregator address (zero for no swap)
    /// @param swapCalldata Encoded calldata for aggregator call
    /// @param minAmountOut Minimum amount expected from the swap (slippage guard)
    /// @param deadline Unix timestamp after which this operation is invalid
    /// @return targetSharesOut Amount of target strategy shares minted to owner
    function migrateStrategyShares(
        address owner,
        address sourceStrategy,
        address targetStrategy,
        uint256 shares,
        address aggregator,
        bytes calldata swapCalldata,
        uint256 minAmountOut,
        uint256 deadline
    ) public nonReentrant returns (uint256 targetSharesOut) {
        require(msg.sender == owner || hasRole(OPERATOR_ROLE, msg.sender), "not owner/operator");
        require(block.timestamp <= deadline, "expired");
        require(owner != address(0), "owner=0");
        require(sourceStrategy != address(0) && targetStrategy != address(0), "bad strategy");
        require(sourceStrategy != targetStrategy, "same strategy");
        require(shares > 0, "zero shares");

        // Realize pending profit/loss for clean donation accounting
        try IYieldStrategy(sourceStrategy).report() {} catch {}

        // Compute assets represented by shares: assets = shares * totalAssets / totalSupply
        uint256 totalAssets = IYieldStrategy(sourceStrategy).totalAssets();
        uint256 totalSupply = IERC20(sourceStrategy).totalSupply();
        require(totalSupply > 0, "source empty");
        uint256 assetsFrom = (shares * totalAssets) / totalSupply;
        require(assetsFrom > 0, "zero assetsFrom");

        address assetFrom = IYieldStrategy(sourceStrategy).asset();
        address assetTo = IYieldStrategy(targetStrategy).asset();

        // Withdraw underlying from source (burns owner's shares inside)
        IYieldStrategy(sourceStrategy).withdraw(assetsFrom, address(this), owner);

        uint256 amountToDeposit;
        if (assetFrom == assetTo) {
            amountToDeposit = assetsFrom;
        } else {
            amountToDeposit = _swapAssets(assetFrom, assetTo, assetsFrom, aggregator, swapCalldata, minAmountOut);
        }

        // Approve and deposit to target strategy for the owner
        IERC20(assetTo).forceApprove(targetStrategy, amountToDeposit);
        targetSharesOut = IYieldStrategy(targetStrategy).deposit(amountToDeposit, owner);

        emit StrategyMigrated(owner, sourceStrategy, targetStrategy, shares, assetsFrom, amountToDeposit, targetSharesOut);
    }

    /// @notice EIP-2612 permit for strategy share token
    /// @param strategy Strategy address (share token)
    /// @param owner Owner granting approval
    /// @param value Allowance value
    /// @param deadline Permit deadline
    /// @param v Sig v
    /// @param r Sig r
    /// @param s Sig s
    function permitShares(
        address strategy,
        address owner,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyRole(OPERATOR_ROLE) {
        IStrategyPermit(strategy).permit(owner, address(this), value, deadline, v, r, s);
    }

    /// @notice Internal swap function
    /// @param assetFrom Source asset
    /// @param assetTo Target asset
    /// @param amountIn Input amount
    /// @param aggregator Aggregator address
    /// @param swapCalldata Swap calldata
    /// @param minAmountOut Minimum output
    /// @return amountOut Output amount
    function _swapAssets(
        address assetFrom,
        address assetTo,
        uint256 amountIn,
        address aggregator,
        bytes calldata swapCalldata,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        require(isAggregator[aggregator], "agg not allowed");

        IERC20(assetFrom).forceApprove(aggregator, amountIn);

        uint256 balBefore = IERC20(assetTo).balanceOf(address(this));
        (bool ok, bytes memory ret) = aggregator.call(swapCalldata);
        require(ok, _getRevertMsg(ret));

        uint256 balAfter = IERC20(assetTo).balanceOf(address(this));
        uint256 received = balAfter - balBefore;
        require(received >= minAmountOut, "slippage");

        IERC20(assetFrom).forceApprove(aggregator, 0);

        return received;
    }

    /// @notice Extract revert message
    /// @param returnData Return data
    /// @return Revert message
    function _getRevertMsg(bytes memory returnData) private pure returns (string memory) {
        if (returnData.length < 68) return "swap failed";
        if (returnData.length > 1000) return "swap failed: data too long";
        assembly {
            returnData := add(returnData, 0x04)
        }
        return abi.decode(returnData, (string));
    }

    /// @notice Add an operator
    /// @param operator Operator address
    function addOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(OPERATOR_ROLE, operator);
    }

    /// @notice Remove an operator
    /// @param operator Operator address
    function removeOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(OPERATOR_ROLE, operator);
    }
}
