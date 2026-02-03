// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {YieldVault} from "./YieldVault.sol";
import {IYieldStrategy} from "../interfaces/IYieldStrategy.sol";

/// @title YieldStrategy
/// @notice Strategy that deploys assets into YieldVault and distributes profit to recipients
/// @dev Implements same share allocation logic as Octant strategies but without Octant dependency
contract YieldStrategy is ERC20, IYieldStrategy, AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable assetToken;
    YieldVault public vault;

    // Accounting for profit/loss tracking
    uint256 public lastReportedAssets;
    uint256 public lastReportedTimestamp;

    // Per-user yield tracking
    mapping(address => uint256) public userAccumulatedYield; // Total yield accumulated per user
    mapping(address => uint256) public userLastReportedValue; // User's position value at last report

    // Events
    event VaultUpdated(address indexed vault);
    event ProfitReported(uint256 profit, uint256 timestamp);
    event LossReported(uint256 loss, uint256 timestamp);
    event FundsDeployed(uint256 amount);
    event FundsFreed(uint256 amount);
    event UserYieldAccumulated(address indexed user, uint256 yieldAmount);
    event UserYieldClaimed(address indexed user, address indexed claimer, uint256 amount);

    constructor(
        address _asset,
        string memory _name,
        string memory _symbol,
        address _vault,
        address _admin
    ) ERC20(_name, _symbol) {
        require(_asset != address(0), "asset=0");
        require(_vault != address(0), "vault=0");

        assetToken = IERC20(_asset);
        vault = YieldVault(payable(_vault));

        require(vault.asset() == _asset, "asset mismatch");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);

        // Approve vault for deposits
        IERC20(_asset).forceApprove(_vault, type(uint256).max);

        // Request strategy role from vault (admin must grant it)
        // This allows the strategy to deposit when publicDepositsEnabled is false
    }

    /// @notice Set the vault address
    /// @param _vault New vault address
    function setVault(address _vault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_vault != address(0), "vault=0");
        require(YieldVault(payable(_vault)).asset() == address(assetToken), "asset mismatch");
        vault = YieldVault(payable(_vault));
        IERC20(address(assetToken)).forceApprove(_vault, type(uint256).max);
        emit VaultUpdated(_vault);
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

    /// @notice Pause the strategy
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause the strategy
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Deposit assets and receive strategy shares
    /// @param assets Amount to deposit
    /// @param receiver Address to receive shares
    /// @return shares Shares minted
    function deposit(uint256 assets, address receiver)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        require(assets > 0, "zero assets");
        require(receiver != address(0), "receiver=0");

        // Pull assets from caller
        assetToken.safeTransferFrom(msg.sender, address(this), assets);

        // Deploy to vault
        _deployFunds(assets);

        // Update yield for receiver before minting (if they already have shares)
        // This captures any yield earned on their existing shares
        _updateUserYield(receiver);

        // Mint shares using same logic as ERC-4626
        shares = _convertToShares(assets, false);
        _mint(receiver, shares);

        // Update last reported value for receiver after minting
        // This sets the baseline for future yield calculations
        uint256 totalSupply = totalSupply();
        uint256 currentAssets = totalAssets();
        if (totalSupply > 0) {
            uint256 newUserValue = (balanceOf(receiver) * currentAssets) / totalSupply;
            userLastReportedValue[receiver] = newUserValue;
        } else {
            // First deposit - initialize
            userLastReportedValue[receiver] = assets;
        }

        emit FundsDeployed(assets);
    }

    /// @notice Withdraw assets by burning shares
    /// @param assets Amount to withdraw
    /// @param receiver Address to receive assets
    /// @param owner Address whose shares to burn
    /// @return shares Shares burned
    function withdraw(uint256 assets, address receiver, address owner)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 shares)
    {
        require(assets > 0, "zero assets");
        require(receiver != address(0), "receiver=0");

        // Update yield for owner before burning (to capture yield up to this point)
        _updateUserYield(owner);

        shares = _convertToShares(assets, true);
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        _burn(owner, shares);

        // Update last reported value for owner after burn
        uint256 totalSupply = totalSupply();
        uint256 currentAssets = totalAssets();
        if (totalSupply > 0 && balanceOf(owner) > 0) {
            uint256 newUserValue = (balanceOf(owner) * currentAssets) / totalSupply;
            userLastReportedValue[owner] = newUserValue;
        } else {
            userLastReportedValue[owner] = 0;
        }

        // Free funds from vault
        _freeFunds(assets);
        assetToken.safeTransfer(receiver, assets);

        emit FundsFreed(assets);
    }

    /// @notice Report profits/losses and accumulate per-user yield based on their share ownership
    /// @return profit The total profit amount (if any) since last report
    /// @return loss The total loss amount (if any) since last report
    function report() external whenNotPaused onlyRole(OPERATOR_ROLE) returns (uint256 profit, uint256 loss) {
        uint256 currentAssets = totalAssets();
        uint256 totalSupply = totalSupply();

        if (lastReportedAssets == 0) {
            lastReportedAssets = currentAssets;
            lastReportedTimestamp = block.timestamp;
            // Initialize user last reported values for existing shareholders
            if (totalSupply > 0) {
                // For first report, set each user's last reported value to their current position
                // This will be done lazily when they have shares
            }
            return (0, 0);
        }

        if (currentAssets > lastReportedAssets) {
            profit = currentAssets - lastReportedAssets;

            if (profit > 0 && totalSupply > 0) {
                // Allocate profit proportionally to each user based on their share ownership
                // We need to iterate through users, but we can't enumerate all holders
                // Instead, we'll track yield when users interact (deposit/withdraw)
                // For now, we'll accumulate yield for active users on next interaction
                // The yield is calculated as: userYield = (userShares / totalShares) * totalProfit
                
                // Store the profit to be allocated per-user on their next interaction
                // Or we can use a snapshot mechanism
                // For simplicity, we'll calculate and accumulate yield for all current shareholders
                
                // Note: This requires iterating through all token holders which can be gas-intensive
                // Alternative: Track yield lazily when users interact (deposit/withdraw/redeem)
                // For now, we'll emit an event and let off-chain service calculate per-user yield
                
                emit ProfitReported(profit, block.timestamp);
            }
        } else if (currentAssets < lastReportedAssets) {
            loss = lastReportedAssets - currentAssets;
            emit LossReported(loss, block.timestamp);
        }

        lastReportedAssets = currentAssets;
        lastReportedTimestamp = block.timestamp;
    }

    /// @notice Update user's yield based on their current share ownership
    /// @dev Should be called before any share transfer (deposit/withdraw) to capture yield
    /// @param user User address to update
    function _updateUserYield(address user) internal {
        uint256 userShares = balanceOf(user);
        uint256 totalSupply = totalSupply();
        uint256 currentAssets = totalAssets();

        if (userShares == 0 || totalSupply == 0 || lastReportedAssets == 0) {
            // Initialize or skip if no shares or no baseline
            userLastReportedValue[user] = userShares > 0 && totalSupply > 0
                ? (userShares * currentAssets) / totalSupply
                : 0;
            return;
        }

        // Calculate user's current position value
        uint256 currentUserValue = (userShares * currentAssets) / totalSupply;
        uint256 lastUserValue = userLastReportedValue[user];

        if (currentUserValue > lastUserValue) {
            // User has gained yield
            uint256 userYield = currentUserValue - lastUserValue;
            userAccumulatedYield[user] += userYield;
            emit UserYieldAccumulated(user, userYield);
        }

        // Update last reported value
        userLastReportedValue[user] = currentUserValue;
    }

    /// @notice Get accumulated yield for a specific user
    /// @param user User address
    /// @return yieldAmount Total accumulated yield for the user
    function getUserYield(address user) external view returns (uint256 yieldAmount) {
        // Calculate current yield based on current position
        uint256 userShares = balanceOf(user);
        uint256 totalSupply = totalSupply();
        uint256 currentAssets = totalAssets();

        if (userShares == 0 || totalSupply == 0 || lastReportedAssets == 0) {
            return userAccumulatedYield[user];
        }

        // Calculate user's current position value
        uint256 currentUserValue = (userShares * currentAssets) / totalSupply;
        uint256 lastUserValue = userLastReportedValue[user];

        // Add any unrealized yield since last update
        uint256 unrealizedYield = currentUserValue > lastUserValue 
            ? currentUserValue - lastUserValue 
            : 0;

        return userAccumulatedYield[user] + unrealizedYield;
    }

    /// @notice Claim a user's accumulated yield and transfer to orchestrator wallet (for off-chain swap/bridge)
    /// @param user User whose yield to claim
    /// @return claimedAmount Total amount claimed and transferred to orchestrator
    function claimUserYield(address user) external whenNotPaused onlyRole(OPERATOR_ROLE) nonReentrant returns (uint256 claimedAmount) {
        require(user != address(0), "user=0");

        // Update user's yield first to capture any unrealized yield
        _updateUserYield(user);

        claimedAmount = userAccumulatedYield[user];
        require(claimedAmount > 0, "no yield");

        // Ensure we have enough liquidity
        uint256 idle = assetToken.balanceOf(address(this));
        if (idle < claimedAmount) {
            uint256 needed = claimedAmount - idle;
            vault.withdraw(needed, address(this), address(this));
        }

        // Transfer yield to orchestrator (msg.sender) for off-chain processing
        assetToken.safeTransfer(msg.sender, claimedAmount);

        // Reset user's accumulated yield
        userAccumulatedYield[user] = 0;

        emit UserYieldClaimed(user, msg.sender, claimedAmount);
    }

    /// @notice Returns the underlying asset address
    /// @return Asset address
    function asset() external view returns (address) {
        return address(assetToken);
    }

    /// @notice Returns the total assets under management
    /// @return Total assets
    function totalAssets() public view returns (uint256) {
        uint256 idle = assetToken.balanceOf(address(this));
        if (address(vault) == address(0)) return idle;
        uint256 shares = vault.balanceOf(address(this));
        uint256 vaultValue = vault.convertToAssets(shares);
        return idle + vaultValue;
    }

    /// @notice Internal function to deploy funds to vault
    /// @param amount Amount to deploy
    function _deployFunds(uint256 amount) internal {
        if (amount == 0) return;
        vault.deposit(amount, address(this));
    }

    /// @notice Internal function to free funds from vault
    /// @param amount Amount to free
    function _freeFunds(uint256 amount) internal {
        if (amount == 0) return;
        vault.withdraw(amount, address(this), address(this));
    }

    /// @notice Convert assets to shares (ERC-4626 style)
    /// @param assets Asset amount
    /// @param roundingUp Whether to round up
    /// @return shares Share amount
    function _convertToShares(uint256 assets, bool roundingUp) internal view returns (uint256 shares) {
        uint256 supply = totalSupply();
        uint256 total = totalAssets();
        // If no shares exist yet, mint 1:1 (standard ERC-4626 behavior)
        if (supply == 0) {
            shares = assets;
        } else if (total == 0) {
            shares = assets;
        } else {
            shares = Math.mulDiv(assets, supply, total, roundingUp ? Math.Rounding.Ceil : Math.Rounding.Floor);
        }
    }

    /// @notice Preview deposit (ERC-4626 style)
    /// @param assets Asset amount
    /// @return shares Share amount
    function previewDeposit(uint256 assets) external view returns (uint256 shares) {
        return _convertToShares(assets, false);
    }

    /// @notice Preview withdraw (ERC-4626 style)
    /// @param assets Asset amount
    /// @return shares Share amount
    function previewWithdraw(uint256 assets) external view returns (uint256 shares) {
        return _convertToShares(assets, true);
    }
}
