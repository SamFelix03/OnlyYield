"""
FastAPI REST API for LLM-Powered Aave USDC Yield Monitoring Agent

This API exposes the agent's decision-making capabilities via HTTP endpoints.
When a request is made, it performs a full analysis and returns the complete output.
"""

import os
import time
import logging
from datetime import datetime
from typing import Dict, Optional, List, Any
from web3 import Web3
import requests
import json
from dotenv import load_dotenv
from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

# Configure logging (no .log file; only console and JSON output)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LLM-Powered Aave Yield Agent API",
    description="API for intelligent Aave yield strategy decisions powered by GPT-4",
    version="1.0.0"
)


class LLMAaveYieldAgent:
    """
    LLM-powered agent for intelligent multi-asset Aave yield strategy decisions.
    Uses OpenAI GPT-4 to analyze market data and make recommendations across multiple stablecoins.
    Supports: USDC, USDT, DAI, and USDC.e (or other stablecoins)
    """
    
    # Aave V3 Base mainnet addresses
    AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
    
    # Supported stablecoins on Base Mainnet
    SUPPORTED_ASSETS = {
        "USDC": {
            "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "decimals": 6,
            "aToken": "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
        },
        "USDT": {
            "address": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
            "decimals": 6,
            "aToken": "0x238789fE7A2Ab31B8d5b7b1c2b5C5F1F5F5F5F5F5",  # Update with actual aToken
        },
        "DAI": {
            "address": "0x50c5725949A6F0c72E6C4a641F24049A917E0CAb",
            "decimals": 18,
            "aToken": "0x238789fE7A2Ab31B8d5b7b1c2b5C5F1F5F5F5F5F5",  # Update with actual aToken
        },
        "USDC.e": {  # Bridged USDC
            "address": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
            "decimals": 6,
            "aToken": "0x238789fE7A2Ab31B8d5b7b1c2b5C5F1F5F5F5F5F5",  # Update with actual aToken
        },
    }
    
    # Legacy USDC address for backward compatibility
    USDC_ADDRESS = SUPPORTED_ASSETS["USDC"]["address"]
    AUSDC_ADDRESS = SUPPORTED_ASSETS["USDC"]["aToken"]

    # YieldVault ABI (view + supplyToAave for pushing idle to Aave)
    VAULT_ABI = [
        {"inputs": [], "name": "totalAssets", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "idleUnderlying", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "aTokenBalance", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "supplyToAave", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    ]
    
    # Aave V3 Pool ABI (simplified)
    POOL_ABI = [
        {
            "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
            "name": "getReserveData",
            "outputs": [
                {
                    "components": [
                        {"internalType": "uint256", "name": "configuration", "type": "uint256"},
                        {"internalType": "uint128", "name": "liquidityIndex", "type": "uint128"},
                        {"internalType": "uint128", "name": "currentLiquidityRate", "type": "uint128"},
                        {"internalType": "uint128", "name": "variableBorrowIndex", "type": "uint128"},
                        {"internalType": "uint128", "name": "currentVariableBorrowRate", "type": "uint128"},
                        {"internalType": "uint128", "name": "currentStableBorrowRate", "type": "uint128"},
                        {"internalType": "uint40", "name": "lastUpdateTimestamp", "type": "uint40"},
                        {"internalType": "uint16", "name": "id", "type": "uint16"},
                        {"internalType": "address", "name": "aTokenAddress", "type": "address"},
                        {"internalType": "address", "name": "stableDebtTokenAddress", "type": "address"},
                        {"internalType": "address", "name": "variableDebtTokenAddress", "type": "address"},
                        {"internalType": "address", "name": "interestRateStrategyAddress", "type": "address"},
                        {"internalType": "uint128", "name": "accruedToTreasury", "type": "uint128"},
                        {"internalType": "uint128", "name": "unbacked", "type": "uint128"},
                        {"internalType": "uint128", "name": "isolationModeTotalDebt", "type": "uint128"}
                    ],
                    "internalType": "struct DataTypes.ReserveData",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    # ERC20 ABI
    ERC20_ABI = [
        {
            "constant": True,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        }
    ]
    
    def __init__(
        self,
        rpc_url: str,
        treasury_address: str,
        openai_api_key: str,
        model: str = "gpt-4o",
        risk_tolerance: str = "moderate",
        supply_to_aave_percent: int = 5,
        operator_private_key: Optional[str] = None,
    ):
        """
        Initialize the LLM-powered Aave yield agent.

        Args:
            rpc_url: Base Mainnet RPC endpoint
            treasury_address: Treasury wallet address to monitor
            openai_api_key: OpenAI API key
            model: OpenAI model to use (gpt-4o, gpt-4-turbo, etc.)
            risk_tolerance: "conservative", "moderate", or "aggressive"
            supply_to_aave_percent: When decision is DEPOSIT, percent of vault idle to supply to Aave (0-100).
            operator_private_key: Optional. If set, agent will call vault.supplyToAave(amount) when decision is DEPOSIT. Must have OPERATOR_ROLE on vault.
        """
        # Web3 setup
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.treasury_address = Web3.to_checksum_address(treasury_address)
        self.risk_tolerance = risk_tolerance
        self.supply_to_aave_percent = max(0, min(100, supply_to_aave_percent))
        self.operator_private_key = operator_private_key.strip() if operator_private_key else None
        # Load vault address from .env (dotenv already loaded at module level)
        vault_addr = os.getenv("YIELD_VAULT_ADDRESS", "").strip()
        self.vault_address = Web3.to_checksum_address(vault_addr) if vault_addr else None
        
        # OpenAI setup
        self.client = OpenAI(api_key=openai_api_key)
        self.model = model
        
        # Initialize contracts
        self.pool_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(self.AAVE_V3_POOL),
            abi=self.POOL_ABI
        )
        self.usdc_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(self.USDC_ADDRESS),
            abi=self.ERC20_ABI
        )
        
        # History tracking
        self.decision_history = []
        self.apy_history_file = "apy_history.json"
        self.apy_history = self._load_apy_history()
    
    def _load_apy_history(self) -> List[Dict]:
        """Load APY history from JSON file."""
        try:
            if os.path.exists(self.apy_history_file):
                with open(self.apy_history_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load APY history: {e}")
        return []

    def _save_apy_history(self):
        """Save APY history to JSON file."""
        try:
            with open(self.apy_history_file, 'w') as f:
                json.dump(self.apy_history, f, indent=2)
        except Exception as e:
            logger.error(f"Could not save APY history: {e}")

    def _record_apy(self, apy: float):
        """Record current APY with timestamp."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "apy": apy,
            "unix_timestamp": int(time.time())
        }
        self.apy_history.append(entry)
        # Keep only last 1000 entries to prevent file from growing too large
        if len(self.apy_history) > 1000:
            self.apy_history = self.apy_history[-1000:]
        self._save_apy_history()

    def get_current_apy(self, asset: str = "USDC") -> float:
        """
        Get current supply APY from Aave for a specific asset.
        
        Aave's currentLiquidityRate is stored in RAY format (27 decimals).
        This matches the TypeScript implementation in aave-markets.ts which does:
        (ray * 100) / RAY to get the percentage directly.
        
        Args:
            asset: Asset symbol (USDC, USDT, DAI, USDC.e)
        """
        try:
            if asset not in self.SUPPORTED_ASSETS:
                logger.error(f"Unsupported asset: {asset}")
                return 0.0
            
            asset_address = Web3.to_checksum_address(self.SUPPORTED_ASSETS[asset]["address"])
            reserve_data = self.pool_contract.functions.getReserveData(
                asset_address
            ).call()
            
            liquidity_rate = reserve_data[2]
            RAY = 10 ** 27
            
            # Ensure liquidity_rate is a number
            if isinstance(liquidity_rate, (list, tuple)):
                liquidity_rate = liquidity_rate[0] if liquidity_rate else 0
            
            # Convert to int if it's a string or other type
            try:
                liquidity_rate = int(liquidity_rate)
            except (ValueError, TypeError) as e:
                logger.error(f"Could not convert liquidity_rate to int: {e}")
                return 0.0
            
            # Direct conversion matching TypeScript implementation
            apy = (liquidity_rate * 100) / RAY
            
            # Sanity check
            if apy > 10000:
                logger.error(f"APY calculation seems incorrect for {asset}. Capping at 1000% for safety.")
                apy = 1000.0
            
            logger.info(f"Current Aave {asset} APY: {apy:.4f}%")
            return apy
        except Exception as e:
            logger.error(f"Error fetching Aave APY for {asset}: {e}", exc_info=True)
            return 0.0
    
    def get_all_asset_apys(self) -> Dict[str, float]:
        """Get APY for all supported assets."""
        apys = {}
        for asset in self.SUPPORTED_ASSETS.keys():
            apys[asset] = self.get_current_apy(asset)
        return apys
    
    def get_treasury_balances(self) -> Dict[str, float]:
        """Get treasury balances for all supported assets."""
        balances = {}
        for asset, config in self.SUPPORTED_ASSETS.items():
            try:
                token_contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(config["address"]),
                    abi=self.ERC20_ABI
                )
                balance_raw = token_contract.functions.balanceOf(
                    self.treasury_address
                ).call()
                balance = balance_raw / (10 ** config["decimals"])
                balances[asset] = balance
                logger.info(f"Treasury {asset} Balance: {balance:,.2f}")
            except Exception as e:
                logger.error(f"Error fetching {asset} balance: {e}")
                balances[asset] = 0.0
        return balances
    
    def execute_lifi_swap(
        self, 
        from_token: str, 
        to_token: str, 
        amount: int, 
        recipient: str
    ) -> Dict[str, Any]:
        """
        Execute a token swap using LI.FI SDK via Node.js script.
        
        Args:
            from_token: Source token symbol (USDC, USDT, DAI, USDC.e)
            to_token: Destination token symbol
            amount: Amount in base units (raw, with decimals)
            recipient: Recipient address
            
        Returns:
            Dict with success status and transaction hash
        """
        if not self.operator_private_key:
            return {
                "success": False,
                "error": "OPERATOR_PRIVATE_KEY not set"
            }
        
        try:
            import subprocess
            import json as json_module
            
            # Get script path
            script_path = os.path.join(os.path.dirname(__file__), "lifi_swap.js")
            
            # Execute Node.js script
            result = subprocess.run(
                [
                    "node",
                    script_path,
                    from_token,
                    to_token,
                    str(amount),
                    self.operator_private_key,
                    recipient
                ],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"LI.FI swap failed: {result.stderr}")
                return {
                    "success": False,
                    "error": result.stderr
                }
            
            # Parse JSON output from script
            output_lines = result.stdout.strip().split('\n')
            json_output = output_lines[-1]  # Last line should be JSON
            swap_result = json_module.loads(json_output)
            
            if swap_result.get("success"):
                logger.info(f"LI.FI swap successful: {swap_result.get('txHash')}")
            else:
                logger.error(f"LI.FI swap failed: {swap_result.get('error')}")
            
            return swap_result
            
        except Exception as e:
            logger.error(f"Error executing LI.FI swap: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def execute_orchestrator_deposit(
        self,
        asset: str,
        amount: int,
        receiver: str
    ) -> Dict[str, Any]:
        """
        Execute deposit via YieldOrchestrator.depositERC20().
        
        IMPORTANT: This function does NOT use the orchestrator's internal swap feature.
        We use LI.FI for all token swaps because:
        - LI.FI aggregates across multiple DEXs (better rates)
        - LI.FI finds optimal routes and splits large swaps
        - Better slippage protection and gas optimization
        
        Flow: Swap via LI.FI first → Then deposit (inputAsset == targetAsset, no swap)
        
        Args:
            asset: Asset symbol (must match strategy asset - already swapped via LI.FI if needed)
            amount: Amount in base units
            receiver: Receiver address
            
        Returns:
            Dict with success status and transaction hash
        """
        if not self.operator_private_key:
            return {
                "success": False,
                "error": "OPERATOR_PRIVATE_KEY not set"
            }
        
        orchestrator_addr = os.getenv("YIELD_ORCHESTRATOR_ADDRESS", "").strip()
        if not orchestrator_addr:
            return {
                "success": False,
                "error": "YIELD_ORCHESTRATOR_ADDRESS not set"
            }
        
        try:
            from eth_account import Account
            
            # YieldOrchestrator ABI (simplified for depositERC20)
            ORCHESTRATOR_ABI = [
                {
                    "inputs": [
                        {"name": "from", "type": "address"},
                        {"name": "inputAsset", "type": "address"},
                        {"name": "amountIn", "type": "uint256"},
                        {"name": "targetAsset", "type": "address"},
                        {"name": "minAmountOut", "type": "uint256"},
                        {"name": "receiver", "type": "address"}
                    ],
                    "name": "depositERC20",
                    "outputs": [{"name": "sharesOut", "type": "uint256"}],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
            
            orchestrator = self.w3.eth.contract(
                address=Web3.to_checksum_address(orchestrator_addr),
                abi=ORCHESTRATOR_ABI
            )
            
            asset_addr = Web3.to_checksum_address(
                self.SUPPORTED_ASSETS[asset]["address"]
            )
            
            # For same-asset deposit, inputAsset == targetAsset, minAmountOut == amount
            account = Account.from_key(self.operator_private_key)
            chain_id = self.w3.eth.chain_id
            nonce = self.w3.eth.get_transaction_count(account.address)
            
            tx = orchestrator.functions.depositERC20(
                self.treasury_address,  # from
                asset_addr,  # inputAsset (same as targetAsset)
                amount,  # amountIn
                asset_addr,  # targetAsset (same as inputAsset - no swap)
                amount,  # minAmountOut (same as amountIn since no swap)
                Web3.to_checksum_address(receiver)  # receiver
            ).build_transaction({
                "from": account.address,
                "chainId": chain_id,
                "nonce": nonce,
                "gas": 300_000,  # Standard gas for deposit (no swap)
            })
            
            signed = account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash_hex = tx_hash.hex()
            
            logger.info(f"Orchestrator deposit tx sent: {tx_hash_hex} (asset: {asset}, amount: {amount})")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt.get("status") == 1:
                return {
                    "success": True,
                    "tx_hash": tx_hash_hex,
                    "asset": asset,
                    "amount": amount
                }
            else:
                return {
                    "success": False,
                    "error": "Transaction reverted",
                    "tx_hash": tx_hash_hex
                }
                
        except Exception as e:
            logger.error(f"Error executing orchestrator deposit: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def get_historical_yield_metrics(self) -> Dict:
        """
        Calculate historical yield metrics from tracked APY data and external APIs.
        Returns trend analysis, volatility, and performance metrics.
        """
        metrics = {
            "apy_trend": "insufficient_data",
            "apy_change_24h": None,
            "apy_change_7d": None,
            "apy_avg_7d": None,
            "apy_avg_30d": None,
            "apy_volatility_7d": None,
            "apy_volatility_30d": None,
            "apy_max": None,
            "apy_min": None,
            "data_points": len(self.apy_history),
        }

        if len(self.apy_history) < 2:
            return metrics

        # Extract APY values and timestamps
        apy_values = [entry["apy"] for entry in self.apy_history]
        timestamps = [entry["unix_timestamp"] for entry in self.apy_history]
        current_time = int(time.time())

        # Calculate 24h and 7d changes
        now_24h_ago = current_time - (24 * 60 * 60)
        now_7d_ago = current_time - (7 * 24 * 60 * 60)
        now_30d_ago = current_time - (30 * 24 * 60 * 60)

        current_apy = apy_values[-1] if apy_values else 0

        # Find APY values within time windows
        apy_24h = [entry["apy"] for entry in self.apy_history if entry["unix_timestamp"] >= now_24h_ago]
        apy_7d = [entry["apy"] for entry in self.apy_history if entry["unix_timestamp"] >= now_7d_ago]
        apy_30d = [entry["apy"] for entry in self.apy_history if entry["unix_timestamp"] >= now_30d_ago]

        if len(apy_24h) >= 2:
            metrics["apy_change_24h"] = current_apy - apy_24h[0]
            metrics["apy_change_24h_pct"] = ((current_apy - apy_24h[0]) / apy_24h[0] * 100) if apy_24h[0] > 0 else 0

        if len(apy_7d) >= 2:
            metrics["apy_change_7d"] = current_apy - apy_7d[0]
            metrics["apy_change_7d_pct"] = ((current_apy - apy_7d[0]) / apy_7d[0] * 100) if apy_7d[0] > 0 else 0
            metrics["apy_avg_7d"] = sum(apy_7d) / len(apy_7d)
            if len(apy_7d) >= 2:
                mean_7d = metrics["apy_avg_7d"]
                variance_7d = sum((x - mean_7d) ** 2 for x in apy_7d) / len(apy_7d)
                metrics["apy_volatility_7d"] = variance_7d ** 0.5  # Standard deviation

        if len(apy_30d) >= 2:
            metrics["apy_avg_30d"] = sum(apy_30d) / len(apy_30d)
            if len(apy_30d) >= 2:
                mean_30d = metrics["apy_avg_30d"]
                variance_30d = sum((x - mean_30d) ** 2 for x in apy_30d) / len(apy_30d)
                metrics["apy_volatility_30d"] = variance_30d ** 0.5

        # Overall stats
        if apy_values:
            metrics["apy_max"] = max(apy_values)
            metrics["apy_min"] = min(apy_values)

        # Determine trend
        if len(apy_values) >= 3:
            recent_3 = apy_values[-3:]
            if recent_3[-1] > recent_3[0]:
                metrics["apy_trend"] = "rising"
            elif recent_3[-1] < recent_3[0]:
                metrics["apy_trend"] = "falling"
            else:
                metrics["apy_trend"] = "stable"

        # Fetch historical data from DefiLlama API if available
        try:
            defillama_data = self._fetch_defillama_historical()
            if defillama_data:
                metrics["defillama_historical"] = defillama_data
        except Exception as e:
            logger.debug(f"Could not fetch DefiLlama historical data: {e}")

        return metrics

    def _fetch_defillama_historical(self) -> Optional[Dict]:
        """
        Fetch historical yield data from DefiLlama API for Aave v3 Base.
        Returns historical APY data if available.
        """
        try:
            pool_id = os.getenv("DEFILLAMA_POOL_ID", "").strip()
            if not pool_id:
                # Try to find Aave v3 Base USDC pool
                response = requests.get(
                    "https://yields.llama.fi/pools",
                    params={"chain": "Base", "protocol": "aave-v3"},
                    timeout=10
                )
                if response.status_code == 200:
                    pools = response.json().get("data", [])
                    usdc_pools = [p for p in pools if "USDC" in p.get("symbol", "")]
                    if usdc_pools:
                        pool_id = usdc_pools[0].get("pool", "")
            
            if pool_id:
                # Fetch historical data for the pool
                hist_response = requests.get(
                    f"https://yields.llama.fi/chart/{pool_id}",
                    timeout=10
                )
                if hist_response.status_code == 200:
                    hist_data = hist_response.json()
                    return {
                        "source": "defillama",
                        "pool_id": pool_id,
                        "data_points": len(hist_data.get("data", [])),
                        "latest_apy": hist_data.get("data", [{}])[-1].get("apy") if hist_data.get("data") else None,
                    }
        except Exception as e:
            logger.debug(f"DefiLlama historical fetch error: {e}")
        return None
    
    def get_treasury_balance(self) -> float:
        """Get treasury wallet USDC balance (ERC20 balanceOf)."""
        try:
            balance_wei = self.usdc_contract.functions.balanceOf(
                self.treasury_address
            ).call()
            balance_usdc = balance_wei / 10 ** 6
            logger.info(f"Treasury USDC Balance: {balance_usdc:,.2f} USDC")
            return balance_usdc
        except Exception as e:
            logger.error(f"Error fetching treasury balance: {e}")
            return 0.0

    def get_vault_balances(self) -> Optional[Dict[str, float]]:
        """
        Get YieldVault balances: outside Aave (idle) and inside Aave (supplied).
        Same logic as read_vault_balance.py. Returns None if no vault address or contract missing.
        """
        if not self.vault_address:
            return None
        try:
            code = self.w3.eth.get_code(self.vault_address)
            if not code or code == b"":
                logger.warning(f"No contract at YIELD_VAULT_ADDRESS {self.vault_address}")
                return None
            vault = self.w3.eth.contract(address=self.vault_address, abi=self.VAULT_ABI)
            idle = vault.functions.idleUnderlying().call()
            a_token = vault.functions.aTokenBalance().call()
            total = vault.functions.totalAssets().call()
            decimals = 6
            return {
                "outside_aave_usdc": idle / (10**decimals),
                "inside_aave_usdc": a_token / (10**decimals),
                "total_usdc": total / (10**decimals),
            }
        except Exception as e:
            logger.error(f"Error fetching vault balances: {e}")
            return None

    def execute_supply_to_aave(self, market_data: Dict) -> Dict:
        """
        Supply a percentage of vault idle to Aave via YieldVault.supplyToAave(amount).
        Caller must have OPERATOR_ROLE on the vault. Uses supply_to_aave_percent of idle.
        Returns dict with success status and transaction details.
        """
        result = {
            "success": False,
            "tx_hash": None,
            "amount_usdc": 0.0,
            "error": None
        }
        
        if not self.vault_address:
            result["error"] = "YIELD_VAULT_ADDRESS not set in .env"
            return result
        if not self.operator_private_key:
            result["error"] = "OPERATOR_PRIVATE_KEY not set in .env"
            return result
        try:
            from eth_account import Account
            vault = self.w3.eth.contract(address=self.vault_address, abi=self.VAULT_ABI)
            idle_raw = vault.functions.idleUnderlying().call()
            if idle_raw == 0:
                result["error"] = "No idle in vault"
                result["success"] = True  # Not an error, just nothing to do
                return result
            amount_raw = (idle_raw * self.supply_to_aave_percent) // 100
            if amount_raw == 0:
                result["error"] = "Supply amount would be 0 (idle too small)"
                result["success"] = True  # Not an error, just nothing to do
                return result
            account = Account.from_key(self.operator_private_key)
            account_address = account.address
            chain_id = self.w3.eth.chain_id
            # Get nonce for the account (required for transaction signing)
            nonce = self.w3.eth.get_transaction_count(account_address)
            tx = vault.functions.supplyToAave(amount_raw).build_transaction({
                "from": account_address,
                "chainId": chain_id,
                "nonce": nonce,
                "gas": 200_000,
            })
            signed = account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash_hex = tx_hash.hex()
            logger.info(f"supplyToAave tx sent: {tx_hash_hex} (amount={amount_raw} raw, {amount_raw/1e6:.6f} USDC)")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt.get("status") == 1:
                result["success"] = True
                result["tx_hash"] = tx_hash_hex
                result["amount_usdc"] = amount_raw / 1e6
                logger.info("supplyToAave succeeded")
            else:
                result["error"] = "Transaction reverted"
                logger.error("supplyToAave tx reverted")
        except Exception as e:
            result["error"] = str(e)
            logger.error("execute_supply_to_aave failed: %s", e, exc_info=True)
        return result

    def get_alternative_yields(self) -> Dict[str, float]:
        """Get yields from alternative DeFi protocols."""
        alternatives = {}
        try:
            response = requests.get("https://yields.llama.fi/pools", timeout=10)
            if response.status_code == 200:
                data = response.json()
                for pool in data.get('data', []):
                    if (pool.get('chain') == 'Base' and 
                        'USDC' in pool.get('symbol', '') and
                        pool.get('apy', 0) > 0):
                        protocol = pool.get('project', 'Unknown')
                        apy = pool.get('apy', 0)
                        if protocol not in alternatives or alternatives[protocol] < apy:
                            alternatives[protocol] = apy
                logger.info(f"Alternative yields found: {alternatives}")
        except Exception as e:
            logger.warning(f"Could not fetch alternative yields: {e}")
        
        if not alternatives:
            alternatives['Conservative Benchmark'] = 1.0
        return alternatives
    
    def estimate_gas_cost(self) -> float:
        """Estimate gas cost for Aave deposit transaction."""
        try:
            gas_price = self.w3.eth.gas_price
            estimated_gas_units = 250000
            cost_wei = gas_price * estimated_gas_units
            cost_eth = cost_wei / 10 ** 18
            
            try:
                price_response = requests.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": "ethereum", "vs_currencies": "usd"},
                    timeout=5
                )
                eth_price = price_response.json().get('ethereum', {}).get('usd', 3000)
            except:
                eth_price = 3000
            
            cost_usd = cost_eth * eth_price
            logger.info(f"Estimated gas cost: ${cost_usd:.4f}")
            return cost_usd
        except Exception as e:
            logger.error(f"Error estimating gas cost: {e}")
            return 100.0
    
    def get_market_context(self) -> Dict:
        """Gather all market data for LLM analysis (multi-asset)."""
        # Get APY for all supported assets
        asset_apys = self.get_all_asset_apys()
        
        # Get treasury balances for all assets
        treasury_balances = self.get_treasury_balances()
        
        # Calculate total treasury value (in USD, assuming 1:1 for stablecoins)
        total_treasury_value = sum(treasury_balances.values())
        
        ctx = {
            'timestamp': datetime.now().isoformat(),
            'aave_apy': asset_apys.get('USDC', 0.0),  # Legacy field for backward compatibility
            'asset_apys': asset_apys,  # APY for all assets
            'treasury_balance': treasury_balances.get('USDC', 0.0),  # Legacy field
            'treasury_balances': treasury_balances,  # Balances for all assets
            'total_treasury_value': total_treasury_value,
            'alternative_yields': self.get_alternative_yields(),
            'gas_cost_usd': self.estimate_gas_cost(),
            'network': 'Base Mainnet',
            'supported_assets': list(self.SUPPORTED_ASSETS.keys()),
        }
        vault_balances = self.get_vault_balances()
        ctx['vault_balances'] = vault_balances  # None or {outside_aave_usdc, inside_aave_usdc, total_usdc}
        
        # Add historical yield metrics
        ctx['historical_yield_metrics'] = self.get_historical_yield_metrics()
        
        return ctx
    
    def create_system_prompt(self) -> str:
        """Create the system prompt for the LLM agent (multi-asset)."""
        supported_assets_str = ", ".join(self.SUPPORTED_ASSETS.keys())
        return f"""You are an expert DeFi yield strategist and financial advisor specializing in Aave protocol and multi-asset portfolio management.

Your role is to analyze market data across multiple stablecoins and make intelligent allocation decisions for Aave v3 on Base Mainnet.

SUPPORTED ASSETS: {supported_assets_str}
RISK TOLERANCE: {self.risk_tolerance.upper()}

YOUR DECISION FRAMEWORK:
1. Analyze APY for ALL supported assets (USDC, USDT, DAI, USDC.e)
2. Compare APY differences and identify the best yield opportunities
3. Consider treasury balances across all assets
4. Evaluate whether swaps are needed (using LI.FI) and if they're cost-effective
5. Consider gas costs for swaps and deposits
6. Make allocation decisions: which assets to invest in, and in what proportions
7. Decide if swaps are needed to optimize yield

RESPONSE FORMAT:
You must respond with a JSON object containing:
{{
    "decision": "DEPOSIT" or "HOLD",
    "confidence": 0-100 (percentage),
    "reasoning": "detailed explanation of your decision including multi-asset analysis",
    "allocation": {{
        "USDC": 0-100 (percentage of total to allocate to USDC strategy),
        "USDT": 0-100 (percentage of total to allocate to USDT strategy),
        "DAI": 0-100 (percentage of total to allocate to DAI strategy),
        "USDC.e": 0-100 (percentage of total to allocate to USDC.e strategy)
    }},
    "swaps_needed": [
        {{"from": "USDC", "to": "USDT", "amount_percent": 25, "reason": "USDT has higher APY"}}
    ],
    "key_factors": ["list", "of", "key", "factors"],
    "projected_30day_return": estimated return in USD (calculate based on allocation),
    "projected_90day_return": estimated return in USD (calculate based on allocation),
    "risks": ["list", "of", "risks"],
    "opportunities": ["list", "of", "opportunities"],
    "alternative_recommendation": "if not depositing, what should be done instead"
}}

ALLOCATION GUIDELINES:
- Allocation percentages should sum to 100% (or less if holding some cash)
- Prioritize assets with higher APY, but consider:
  * Swap costs (gas + slippage)
  * Liquidity differences
  * Risk diversification
- If APY differences are small (<0.5%), consider keeping current allocation to avoid swap costs
- If one asset has significantly higher APY (>1%), consider reallocating

SWAP DECISION LOGIC:
- Only recommend swaps if the APY difference justifies the swap cost
- Calculate: (APY_diff * balance * days / 365) > (gas_cost + slippage_cost)
- For small balances, swaps may not be cost-effective
- Consider batching swaps to reduce gas costs

CALCULATION INSTRUCTIONS FOR PROJECTED RETURNS:
- Calculate returns for each asset based on allocation percentage
- Formula per asset: (total_balance * allocation% / 100) * (APY / 100) * (days / 365)
- Sum all asset returns
- Subtract swap costs (gas + slippage) if swaps are needed
- For 30 days: sum of all asset returns - swap costs
- For 90 days: sum of all asset returns - swap costs (one-time)

IMPORTANT GUIDELINES:
- For CONSERVATIVE risk tolerance: Diversify across assets, minimize swaps, prioritize stability
- For MODERATE risk tolerance: Balance yield optimization with diversification
- For AGGRESSIVE risk tolerance: Maximize yield, accept swap costs, concentrate in highest APY assets
- Always consider gas costs in your profitability calculations
- Think step-by-step through your analysis
- Be honest about uncertainties and risks
- Provide actionable insights, not just data regurgitation

Remember: You're managing real treasury funds on Base Mainnet. Your recommendations should be professional, well-reasoned, and defensible. Consider both yield optimization and risk management."""

    def ask_llm_for_decision(self, market_data: Dict) -> Dict:
        """Use GPT-4 to analyze market data and make a decision."""
        
        vb = market_data.get('vault_balances')
        vault_block = ""
        if vb:
            vault_block = f"""
VAULT BALANCES (application holdings, same as read_vault_balance.py):
- OUTSIDE Aave (idle in vault): {vb['outside_aave_usdc']:,.6f} USDC
- INSIDE Aave (supplied):       {vb['inside_aave_usdc']:,.6f} USDC
- Total in vault:               {vb['total_usdc']:,.6f} USDC
"""
        else:
            vault_block = "\n(Vault balances not available; set YIELD_VAULT_ADDRESS in .env)\n"

        # Prepare the market data summary with multi-asset data
        asset_apys = market_data.get('asset_apys', {})
        treasury_balances = market_data.get('treasury_balances', {})
        total_value = market_data.get('total_treasury_value', 0)
        
        market_summary = f"""
CURRENT MARKET DATA (Base Mainnet - Multi-Asset Analysis):

AAVE APY BY ASSET:
"""
        for asset, apy in asset_apys.items():
            market_summary += f"- {asset}: {apy:.4f}% APY\n"
        
        market_summary += f"""
TREASURY BALANCES:
"""
        for asset, balance in treasury_balances.items():
            market_summary += f"- {asset}: ${balance:,.2f}\n"
        
        market_summary += f"""
- Total Treasury Value: ${total_value:,.2f}
- Estimated Gas Cost (per transaction): ${market_data['gas_cost_usd']:.2f}
{vault_block}

ALTERNATIVE YIELDS (Base Mainnet for comparison):
"""
        for protocol, apy in market_data['alternative_yields'].items():
            market_summary += f"- {protocol}: {apy:.2f}% APY\n"
        
        # Calculate metrics for best asset
        best_asset = max(asset_apys.items(), key=lambda x: x[1])[0] if asset_apys else "USDC"
        best_apy = asset_apys.get(best_asset, 0)
        
        market_summary += f"""
CALCULATED METRICS:
- Total Treasury Value: ${total_value:,.2f}
- Best APY Asset: {best_asset} ({best_apy:.4f}% APY)
- Daily interest at best APY: ${(total_value * best_apy / 100 / 365):,.2f}
- Gas cost as % of balance: {(market_data['gas_cost_usd'] / total_value * 100) if total_value > 0 else 0:.4f}%
- Days to recover gas cost: {(market_data['gas_cost_usd'] / (total_value * best_apy / 100 / 365)) if best_apy > 0 and total_value > 0 else float('inf'):.2f} days

HISTORICAL YIELD ANALYSIS:
"""
        hist_metrics = market_data.get('historical_yield_metrics', {})
        if hist_metrics.get('data_points', 0) >= 2:
            market_summary += f"""- APY Trend: {hist_metrics.get('apy_trend', 'insufficient_data').upper()}
- Current APY: {market_data['aave_apy']:.4f}%
- 24h Change: {hist_metrics.get('apy_change_24h', 0):+.4f}% ({hist_metrics.get('apy_change_24h_pct', 0):+.2f}%)
- 7d Change: {hist_metrics.get('apy_change_7d', 0):+.4f}% ({hist_metrics.get('apy_change_7d_pct', 0):+.2f}%)
- 7d Average APY: {hist_metrics.get('apy_avg_7d', 0):.4f}%
- 30d Average APY: {hist_metrics.get('apy_avg_30d', 0):.4f}% (if available)
- 7d Volatility (std dev): {hist_metrics.get('apy_volatility_7d', 0):.4f}%
- 30d Volatility (std dev): {hist_metrics.get('apy_volatility_30d', 0):.4f}% (if available)
- All-time High: {hist_metrics.get('apy_max', 0):.4f}%
- All-time Low: {hist_metrics.get('apy_min', 0):.4f}%
- Data points tracked: {hist_metrics.get('data_points', 0)}
"""
            if hist_metrics.get('defillama_historical'):
                dl = hist_metrics['defillama_historical']
                market_summary += f"- DefiLlama historical data: {dl.get('data_points', 0)} points available\n"
        else:
            market_summary += f"- Insufficient historical data ({hist_metrics.get('data_points', 0)} points). Tracking started.\n"

        market_summary += f"""
DECISION HISTORY:
- Total decisions made: {len(self.decision_history)}
- Recent decisions: {[d['llm_analysis']['decision'] for d in self.decision_history[-5:]]}

Based on this multi-asset data, analyze:
1. Which asset(s) offer the best yield?
2. Should we swap any assets to optimize yield?
3. What allocation should we use across assets?
4. Are swap costs justified by APY differences?

Provide your recommendation in the required JSON format with allocation percentages and swap instructions.
"""
        
        logger.info("Requesting decision from GPT-4...")
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.create_system_prompt()},
                    {"role": "user", "content": market_summary}
                ],
                temperature=0.7,  # Some creativity but not too random
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            # Parse the LLM response
            llm_response = response.choices[0].message.content
            decision_data = json.loads(llm_response)
            
            # Calculate projected returns if LLM didn't provide them or returned 0
            vb = market_data.get('vault_balances')
            balance_for_calc = vb['total_usdc'] if vb and vb.get('total_usdc', 0) > 0 else market_data.get('treasury_balance', 0)
            aave_apy = market_data.get('aave_apy', 0)
            gas_cost = market_data.get('gas_cost_usd', 0)
            
            # Only calculate if decision is DEPOSIT and we have valid data
            if decision_data.get('decision') == 'DEPOSIT' and balance_for_calc > 0 and aave_apy > 0:
                if not decision_data.get('projected_30day_return') or decision_data.get('projected_30day_return', 0) == 0:
                    # Calculate: balance * (APY / 100) * (30 / 365) - gas_cost (one-time)
                    projected_30d = (balance_for_calc * aave_apy / 100 * 30 / 365) - gas_cost
                    decision_data['projected_30day_return'] = max(0, projected_30d)  # Don't go negative
                    logger.info(f"Calculated projected_30day_return: ${projected_30d:.2f}")
                
                if not decision_data.get('projected_90day_return') or decision_data.get('projected_90day_return', 0) == 0:
                    # Calculate: balance * (APY / 100) * (90 / 365) - gas_cost (one-time)
                    projected_90d = (balance_for_calc * aave_apy / 100 * 90 / 365) - gas_cost
                    decision_data['projected_90day_return'] = max(0, projected_90d)  # Don't go negative
                    logger.info(f"Calculated projected_90day_return: ${projected_90d:.2f}")
            elif decision_data.get('decision') == 'HOLD':
                # For HOLD decisions, ensure returns are 0
                decision_data['projected_30day_return'] = 0
                decision_data['projected_90day_return'] = 0
            
            # Log token usage
            logger.info(f"Tokens used - Prompt: {response.usage.prompt_tokens}, "
                       f"Completion: {response.usage.completion_tokens}, "
                       f"Total: {response.usage.total_tokens}")
            
            return decision_data
            
        except Exception as e:
            logger.error(f"Error getting LLM decision: {e}")
            # Fallback to conservative decision
            return {
                "decision": "HOLD",
                "confidence": 0,
                "reasoning": f"Error communicating with LLM: {str(e)}. Defaulting to HOLD for safety.",
                "key_factors": ["LLM Error"],
                "projected_30day_return": 0,
                "projected_90day_return": 0,
                "risks": ["Unable to get LLM analysis"],
                "opportunities": [],
                "alternative_recommendation": "Wait for system to recover"
            }
    
    def make_decision(self) -> Dict:
        """Main decision-making process powered by LLM. Returns complete decision data."""
        logger.info("=" * 80)
        logger.info("[AGENT] STARTING LLM-POWERED YIELD ANALYSIS")
        logger.info("=" * 80)
        
        # Gather market data
        market_data = self.get_market_context()
        
        # Get LLM decision
        llm_decision = self.ask_llm_for_decision(market_data)
        
        # Combine with market data
        full_decision = {
            'timestamp': market_data['timestamp'],
            'market_data': market_data,
            'llm_analysis': llm_decision,
            'model_used': self.model,
            'risk_tolerance': self.risk_tolerance
        }
        
        # Store decision
        self.decision_history.append(full_decision)

        # Execute multi-asset allocation if decision is DEPOSIT
        transaction_results = []
        if llm_decision.get("decision") == "DEPOSIT":
            allocation = llm_decision.get("allocation", {})
            swaps_needed = llm_decision.get("swaps_needed", [])
            total_value = market_data.get('total_treasury_value', 0)
            treasury_balances = market_data.get('treasury_balances', {})
            
            logger.info(f"Decision is DEPOSIT. Executing multi-asset allocation...")
            logger.info(f"Allocation: {allocation}")
            logger.info(f"Swaps needed: {swaps_needed}")
            
            # Execute swaps first
            for swap in swaps_needed:
                from_token = swap.get("from")
                to_token = swap.get("to")
                amount_percent = swap.get("amount_percent", 0)
                
                if from_token not in treasury_balances or to_token not in self.SUPPORTED_ASSETS:
                    logger.warning(f"Invalid swap: {from_token} -> {to_token}")
                    continue
                
                # Calculate swap amount
                from_balance = treasury_balances[from_token]
                swap_amount_usd = total_value * (amount_percent / 100)
                swap_amount_raw = int(swap_amount_usd * (10 ** self.SUPPORTED_ASSETS[from_token]["decimals"]))
                
                if swap_amount_raw == 0:
                    logger.warning(f"Swap amount too small: {from_token} -> {to_token}")
                    continue
                
                logger.info(f"Executing swap: {from_token} -> {to_token}, Amount: {swap_amount_raw} ({amount_percent}%)")
                swap_result = self.execute_lifi_swap(
                    from_token,
                    to_token,
                    swap_amount_raw,
                    self.treasury_address
                )
                transaction_results.append({
                    "type": "swap",
                    "from": from_token,
                    "to": to_token,
                    "result": swap_result
                })
                
                if swap_result.get("success"):
                    logger.info(f"Swap successful: {swap_result.get('txHash')}")
                else:
                    logger.error(f"Swap failed: {swap_result.get('error')}")
            
            # After swaps, refresh balances to get updated amounts
            # Note: In production, you might want to wait for swap confirmations
            # For now, we'll use the expected balances after swaps
            updated_balances = treasury_balances.copy()
            for swap in swaps_needed:
                if swap.get("result", {}).get("success"):
                    from_token = swap.get("from")
                    to_token = swap.get("to")
                    amount_percent = swap.get("amount_percent", 0)
                    swap_amount_usd = total_value * (amount_percent / 100)
                    # Update balances (simplified - in production, wait for actual balance updates)
                    updated_balances[from_token] = updated_balances.get(from_token, 0) - swap_amount_usd
                    updated_balances[to_token] = updated_balances.get(to_token, 0) + swap_amount_usd
            
            # Execute deposits for each asset based on allocation
            # IMPORTANT: We use LI.FI for swaps, then deposit the swapped tokens
            # We do NOT use the orchestrator's internal swap feature
            for asset, allocation_pct in allocation.items():
                if allocation_pct <= 0:
                    continue
                
                if asset not in self.SUPPORTED_ASSETS:
                    logger.warning(f"Invalid asset in allocation: {asset}")
                    continue
                
                # Calculate deposit amount
                deposit_amount_usd = total_value * (allocation_pct / 100)
                deposit_amount_raw = int(deposit_amount_usd * (10 ** self.SUPPORTED_ASSETS[asset]["decimals"]))
                
                if deposit_amount_raw == 0:
                    logger.warning(f"Deposit amount too small for {asset}")
                    continue
                
                # Check if we have enough balance (after swaps)
                current_balance = updated_balances.get(asset, 0)
                if current_balance < deposit_amount_usd:
                    logger.warning(f"Insufficient {asset} balance: {current_balance} < {deposit_amount_usd}")
                    # Use available balance instead
                    deposit_amount_raw = int(current_balance * (10 ** self.SUPPORTED_ASSETS[asset]["decimals"]))
                
                if deposit_amount_raw == 0:
                    continue
                
                # Deposit the asset (already swapped via LI.FI if needed)
                # We use orchestrator's depositERC20 with inputAsset == targetAsset (no internal swap)
                logger.info(f"Executing deposit: {asset}, Amount: {deposit_amount_raw} ({allocation_pct}%)")
                logger.info(f"  Note: Asset already in correct token (swapped via LI.FI if needed)")
                deposit_result = self.execute_orchestrator_deposit(
                    asset,  # asset (inputAsset == targetAsset, no swap)
                    deposit_amount_raw,
                    self.treasury_address  # receiver
                )
                transaction_results.append({
                    "type": "deposit",
                    "asset": asset,
                    "allocation_pct": allocation_pct,
                    "result": deposit_result
                })
                
                if deposit_result.get("success"):
                    logger.info(f"Deposit successful: {deposit_result.get('tx_hash')}")
                else:
                    logger.error(f"Deposit failed: {deposit_result.get('error')}")

        # Add transaction results to decision
        full_decision['transaction_results'] = transaction_results

        # Log the decision
        logger.info("=" * 80)
        logger.info(f"LLM DECISION: {llm_decision['decision']}")
        logger.info(f"CONFIDENCE: {llm_decision['confidence']}%")
        logger.info(f"REASONING: {llm_decision['reasoning']}")
        logger.info("=" * 80)
        
        return full_decision
    
    def generate_report(self) -> str:
        """Generate a comprehensive report of the latest LLM decision."""
        if not self.decision_history:
            return "No decisions made yet."
        
        latest = self.decision_history[-1]
        market = latest['market_data']
        llm = latest['llm_analysis']
        
        report = f"""
================================================================================
                   LLM-POWERED AAVE YIELD AGENT REPORT
                        Powered by OpenAI {latest['model_used']}
================================================================================

TIMESTAMP: {latest['timestamp']}
RISK TOLERANCE: {latest['risk_tolerance'].upper()}

+-- MARKET DATA -----------------------------------------------------------------+
| Treasury wallet:      ${market['treasury_balance']:,.2f} USDC
| Current Aave APY:     {market['aave_apy']:.4f}%
| Gas Cost Estimate:    ${market['gas_cost_usd']:.2f}
| Network:              {market['network']}
"""
        vb = market.get('vault_balances')
        if vb:
            report += f"""|
| VAULT (application holdings, same as read_vault_balance.py):
|   Outside Aave (idle):   ${vb['outside_aave_usdc']:>12,.6f} USDC
|   Inside Aave (supplied): ${vb['inside_aave_usdc']:>11,.6f} USDC
|   Total in vault:        ${vb['total_usdc']:>12,.6f} USDC
"""
        hist_metrics = market.get('historical_yield_metrics', {})
        if hist_metrics.get('data_points', 0) >= 2:
            report += f"""|
| HISTORICAL YIELD ANALYSIS:
|   Trend:                 {hist_metrics.get('apy_trend', 'insufficient_data').upper()}
|   24h Change:            {hist_metrics.get('apy_change_24h', 0):+.4f}% ({hist_metrics.get('apy_change_24h_pct', 0):+.2f}%)
|   7d Change:             {hist_metrics.get('apy_change_7d', 0):+.4f}% ({hist_metrics.get('apy_change_7d_pct', 0):+.2f}%)
|   7d Average:            {hist_metrics.get('apy_avg_7d', 0):.4f}%
|   30d Average:           {hist_metrics.get('apy_avg_30d', 0):.4f}% (if available)
|   7d Volatility:         {hist_metrics.get('apy_volatility_7d', 0):.4f}%
|   30d Volatility:        {hist_metrics.get('apy_volatility_30d', 0):.4f}% (if available)
|   All-time High:         {hist_metrics.get('apy_max', 0):.4f}%
|   All-time Low:          {hist_metrics.get('apy_min', 0):.4f}%
|   Data points:           {hist_metrics.get('data_points', 0)}
"""
        report += """+-------------------------------------------------------------------------------+

+-- COMPETITIVE LANDSCAPE ------------------------------------------------------+
"""
        for protocol, apy in market['alternative_yields'].items():
            report += f"| {protocol:50s} {apy:>6.2f}% APY\n"
        report += """+-------------------------------------------------------------------------------+

+-- LLM DECISION ANALYSIS -----------------------------------------------------+
|
"""
        report += f"| DECISION:     {llm['decision']:60s}\n"
        report += f"| CONFIDENCE:   {llm['confidence']}%\n"
        report += "|\n"
        report += "| REASONING:\n"

        # Wrap reasoning text
        reasoning_lines = llm['reasoning'].split('\n')
        for line in reasoning_lines:
            words = line.split()
            current_line = "|   "
            for word in words:
                if len(current_line) + len(word) + 1 > 76:
                    report += f"{current_line}\n"
                    current_line = "|   "
                current_line += word + " "
            if current_line.strip() != "|":
                report += f"{current_line}\n"

        report += "|\n"
        report += "| KEY FACTORS:\n"
        for factor in llm.get('key_factors', []):
            report += f"|   * {factor:72s}\n"

        report += "|\n"
        report += "| PROJECTED RETURNS:\n"
        report += f"|   30-day: ${llm.get('projected_30day_return', 0):>10.2f}\n"
        report += f"|   90-day: ${llm.get('projected_90day_return', 0):>10.2f}\n"

        if llm.get('risks'):
            report += "|\n"
            report += "| RISKS IDENTIFIED:\n"
            for risk in llm['risks']:
                report += f"|   * {risk:72s}\n"

        if llm.get('opportunities'):
            report += "|\n"
            report += "| OPPORTUNITIES:\n"
            for opp in llm['opportunities']:
                report += f"|   * {opp:72s}\n"

        if llm.get('alternative_recommendation'):
            report += "|\n"
            report += "| ALTERNATIVE STRATEGY:\n"
            alt_lines = llm['alternative_recommendation'].split('\n')
            for line in alt_lines:
                words = line.split()
                current_line = "|   "
                for word in words:
                    if len(current_line) + len(word) + 1 > 76:
                        report += f"{current_line}\n"
                        current_line = "|   "
                    current_line += word + " "
                if current_line.strip() != "|":
                    report += f"{current_line}\n"

        # Add transaction result if available
        tx_result = latest.get('transaction_result')
        if tx_result:
            report += "|\n"
            report += "| TRANSACTION RESULT:\n"
            if tx_result.get('success'):
                report += f"|   Status: SUCCESS\n"
                report += f"|   TX Hash: {tx_result.get('tx_hash', 'N/A')}\n"
                report += f"|   Amount: {tx_result.get('amount_usdc', 0):.6f} USDC\n"
            else:
                report += f"|   Status: FAILED\n"
                report += f"|   Error: {tx_result.get('error', 'Unknown error')}\n"

        report += """+-------------------------------------------------------------------------------+

+-- HISTORICAL SUMMARY --------------------------------------------------------+"""
        report += f"""
| Total Decisions: {len(self.decision_history):>3d}
| DEPOSIT Recommendations: {sum(1 for d in self.decision_history if d['llm_analysis']['decision'] == 'DEPOSIT'):>3d}
| HOLD Recommendations:    {sum(1 for d in self.decision_history if d['llm_analysis']['decision'] == 'HOLD'):>3d}
| Average Confidence:      {sum(d['llm_analysis'].get('confidence', 0) for d in self.decision_history) / len(self.decision_history) if self.decision_history else 0:>3.0f}%
+-------------------------------------------------------------------------------+
"""
        
        return report


# Initialize agent instance (will be created on first request)
_agent_instance: Optional[LLMAaveYieldAgent] = None


def get_agent() -> LLMAaveYieldAgent:
    """Get or create agent instance."""
    global _agent_instance
    if _agent_instance is None:
        # Load configuration from .env
        RPC_URL = os.getenv('BASE_SEPOLIA_RPC_URL', 'https://mainnet.base.org')
        TREASURY_ADDRESS = os.getenv('TREASURY_ADDRESS')
        OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
        OPERATOR_PRIVATE_KEY = os.getenv('OPERATOR_PRIVATE_KEY', '').strip()
        MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o')
        RISK_TOLERANCE = os.getenv('RISK_TOLERANCE', 'moderate').lower()
        SUPPLY_TO_AAVE_PERCENT = int(os.getenv('SUPPLY_TO_AAVE_PERCENT', '5'))
        
        if not TREASURY_ADDRESS:
            raise ValueError("TREASURY_ADDRESS not found in .env file")
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in .env file")
        
        if RISK_TOLERANCE not in ['conservative', 'moderate', 'aggressive']:
            RISK_TOLERANCE = 'moderate'
        
        _agent_instance = LLMAaveYieldAgent(
            rpc_url=RPC_URL,
            treasury_address=TREASURY_ADDRESS,
            openai_api_key=OPENAI_API_KEY,
            model=MODEL,
            risk_tolerance=RISK_TOLERANCE,
            supply_to_aave_percent=SUPPLY_TO_AAVE_PERCENT,
            operator_private_key=OPERATOR_PRIVATE_KEY or None,
        )
        logger.info("Agent instance created")
    return _agent_instance


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "LLM-Powered Aave Yield Agent API",
        "version": "1.0.0",
        "description": "API for intelligent Aave yield strategy decisions powered by GPT-4",
        "endpoints": {
            "/": "This endpoint (API info)",
            "/analyze": "POST - Run full agent analysis and get complete output",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        agent = get_agent()
        return {
            "status": "healthy",
            "agent_initialized": True,
            "vault_address_set": agent.vault_address is not None,
            "operator_key_set": agent.operator_private_key is not None,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.post("/analyze")
async def analyze():
    """
    Run the full agent analysis.
    Performs all agent operations and returns the complete output including:
    - Market data
    - LLM decision and analysis
    - Transaction result (if DEPOSIT was executed)
    - Formatted report
    """
    try:
        agent = get_agent()
        
        # Run the agent's decision-making process
        decision = agent.make_decision()
        
        # Generate the formatted report
        report = agent.generate_report()
        
        # Save decision history to JSON file
        try:
            with open('llm_decision_history.json', 'w') as f:
                json.dump(agent.decision_history, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save decision history: {e}")
        
        # Return complete output
        return {
            "success": True,
            "timestamp": decision['timestamp'],
            "decision": decision['llm_analysis']['decision'],
            "confidence": decision['llm_analysis']['confidence'],
            "full_decision_data": decision,  # Complete decision with all market data
            "formatted_report": report,  # Human-readable formatted report
            "summary": {
                "decision": decision['llm_analysis']['decision'],
                "confidence": decision['llm_analysis']['confidence'],
                "current_apy": decision['market_data']['aave_apy'],
                "treasury_balance": decision['market_data']['treasury_balance'],
                "vault_total": decision['market_data'].get('vault_balances', {}).get('total_usdc'),
                "transaction_executed": decision.get('transaction_result') is not None,
                "transaction_success": decision.get('transaction_result', {}).get('success', False) if decision.get('transaction_result') else False,
            }
        }
    except Exception as e:
        logger.error(f"Error in /analyze endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000)
