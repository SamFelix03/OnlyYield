"""
LLM-Powered Aave USDC Yield Monitoring Agent

This agent uses GPT-4 (OpenAI) to make intelligent decisions about
Aave yield strategies based on real-time blockchain data and market conditions.
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

# Load environment variables from .env file
load_dotenv()

# Configure logging (no .log file; only console and JSON output)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)


class LLMAaveYieldAgent:
    """
    LLM-powered agent for intelligent Aave yield strategy decisions.
    Uses OpenAI GPT-4 to analyze market data and make recommendations.
    """
    
    # Aave V3 Base Sepolia addresses
    AAVE_V3_POOL = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27"
    USDC_ADDRESS = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f"
    AUSDC_ADDRESS = "0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC"

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
        check_interval: int = 300,
        risk_tolerance: str = "moderate",
        supply_to_aave_percent: int = 5,
        operator_private_key: Optional[str] = None,
    ):
        """
        Initialize the LLM-powered Aave yield agent.

        Args:
            rpc_url: Base Sepolia RPC endpoint
            treasury_address: Treasury wallet address to monitor
            openai_api_key: OpenAI API key
            model: OpenAI model to use (gpt-4o, gpt-4-turbo, etc.)
            check_interval: Time between checks in seconds
            risk_tolerance: "conservative", "moderate", or "aggressive"
            supply_to_aave_percent: When decision is DEPOSIT, percent of vault idle to supply to Aave (0-100). Configurable via SUPPLY_TO_AAVE_PERCENT.
            operator_private_key: Optional. If set, agent will call vault.supplyToAave(amount) when decision is DEPOSIT. Must have OPERATOR_ROLE on vault.
        """
        # Web3 setup
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.treasury_address = Web3.to_checksum_address(treasury_address)
        self.check_interval = check_interval
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
        self.conversation_history = []
        self.apy_history_file = "apy_history.json"
        self.apy_history = self._load_apy_history()
        
        logger.info(f"LLM-Powered Aave Yield Agent initialized")
        logger.info(f"Model: {self.model}")
        logger.info(f"Treasury: {self.treasury_address}")
        logger.info(f"Risk Tolerance: {self.risk_tolerance}")
        logger.info(f"Supply to Aave percent (on DEPOSIT): {self.supply_to_aave_percent}%")
        if self.vault_address:
            logger.info(f"Vault (for balance): {self.vault_address}")
        if self.operator_private_key:
            logger.info("Operator key set: will execute supplyToAave on DEPOSIT")
    
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

    def get_current_apy(self) -> float:
        """Get current USDC supply APY from Aave."""
        try:
            usdc_checksum = Web3.to_checksum_address(self.USDC_ADDRESS)
            reserve_data = self.pool_contract.functions.getReserveData(
                usdc_checksum
            ).call()
            
            liquidity_rate = reserve_data[2]
            RAY = 10 ** 27
            rate_per_second = liquidity_rate / RAY
            apy = (rate_per_second * 365 * 24 * 60 * 60) * 100
            
            logger.info(f"Current Aave USDC APY: {apy:.4f}%")
            # Record APY for historical tracking
            self._record_apy(apy)
            return apy
        except Exception as e:
            logger.error(f"Error fetching Aave APY: {e}")
            return 0.0

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
            # DefiLlama API endpoint for Aave v3 Base USDC pool
            # Pool ID can be set in .env as DEFILLAMA_POOL_ID, or will auto-detect
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

    def execute_supply_to_aave(self, market_data: Dict) -> bool:
        """
        Supply a percentage of vault idle to Aave via YieldVault.supplyToAave(amount).
        Caller must have OPERATOR_ROLE on the vault. Uses supply_to_aave_percent of idle.
        """
        if not self.vault_address:
            logger.warning("Cannot execute supplyToAave: YIELD_VAULT_ADDRESS not set in .env")
            return False
        if not self.operator_private_key:
            logger.warning("Cannot execute supplyToAave: OPERATOR_PRIVATE_KEY not set in .env")
            return False
        try:
            from eth_account import Account
            vault = self.w3.eth.contract(address=self.vault_address, abi=self.VAULT_ABI)
            idle_raw = vault.functions.idleUnderlying().call()
            if idle_raw == 0:
                logger.info("No idle in vault; skipping supplyToAave")
                return True
            amount_raw = (idle_raw * self.supply_to_aave_percent) // 100
            if amount_raw == 0:
                logger.info("Supply amount would be 0 (idle too small); skipping")
                return True
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
                logger.info("supplyToAave succeeded")
                return True
            logger.error("supplyToAave tx reverted")
            return False
        except Exception as e:
            logger.error("execute_supply_to_aave failed: %s", e, exc_info=True)
            logger.error("This could be due to: missing OPERATOR_ROLE, insufficient gas, wrong vault address, or network issues")
            return False

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
        """Gather all market data for LLM analysis."""
        ctx = {
            'timestamp': datetime.now().isoformat(),
            'aave_apy': self.get_current_apy(),
            'treasury_balance': self.get_treasury_balance(),
            'alternative_yields': self.get_alternative_yields(),
            'gas_cost_usd': self.estimate_gas_cost(),
            'network': 'Base Sepolia',
            'asset': 'USDC',
        }
        vault_balances = self.get_vault_balances()
        ctx['vault_balances'] = vault_balances  # None or {outside_aave_usdc, inside_aave_usdc, total_usdc}
        
        # Add historical yield metrics
        ctx['historical_yield_metrics'] = self.get_historical_yield_metrics()
        
        return ctx
    
    def create_system_prompt(self) -> str:
        """Create the system prompt for the LLM agent."""
        return f"""You are an expert DeFi yield strategist and financial advisor specializing in Aave protocol.

Your role is to analyze market data and make intelligent decisions about whether to deposit USDC into Aave v3 on Base Sepolia.

RISK TOLERANCE: {self.risk_tolerance.upper()}

YOUR DECISION FRAMEWORK:
1. Analyze the current Aave USDC APY
2. Compare with alternative yield opportunities
3. Consider gas costs and their impact on profitability
4. Evaluate the treasury balance and opportunity cost
5. Consider market trends and protocol risks
6. Make a clear DEPOSIT or HOLD recommendation

RESPONSE FORMAT:
You must respond with a JSON object containing:
{{
    "decision": "DEPOSIT" or "HOLD",
    "confidence": 0-100 (percentage),
    "reasoning": "detailed explanation of your decision",
    "key_factors": ["list", "of", "key", "factors"],
    "projected_30day_return": estimated return in USD,
    "projected_90day_return": estimated return in USD,
    "risks": ["list", "of", "risks"],
    "opportunities": ["list", "of", "opportunities"],
    "alternative_recommendation": "if not depositing, what should be done instead"
}}

IMPORTANT GUIDELINES:
- For CONSERVATIVE risk tolerance: Only recommend DEPOSIT if clearly profitable with minimal risk
- For MODERATE risk tolerance: Balance risk and reward, consider both upside and downside
- For AGGRESSIVE risk tolerance: Maximize yield opportunities, accept higher risk
- Always consider gas costs in your profitability calculations
- Think step-by-step through your analysis
- Be honest about uncertainties and risks
- Provide actionable insights, not just data regurgitation

Remember: You're managing real treasury funds (testnet for now, but treat it as real). Your recommendations should be professional, well-reasoned, and defensible."""

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

        # Prepare the market data summary
        market_summary = f"""
CURRENT MARKET DATA (Base Sepolia - Testnet):

AAVE USDC POSITION:
- Current APY: {market_data['aave_apy']:.4f}%
- Treasury wallet balance: ${market_data['treasury_balance']:,.2f} USDC
- Estimated Gas Cost: ${market_data['gas_cost_usd']:.2f}
{vault_block}

ALTERNATIVE YIELDS (Base Mainnet for comparison):
"""
        for protocol, apy in market_data['alternative_yields'].items():
            market_summary += f"- {protocol}: {apy:.2f}% APY\n"
        
        market_summary += f"""
CALCULATED METRICS (using vault total when available):
- Balance for yield calc: ${(vb['total_usdc'] if vb else market_data['treasury_balance']):,.2f} USDC
- Daily interest at Aave APY: ${((vb['total_usdc'] if vb else market_data['treasury_balance']) * market_data['aave_apy'] / 100 / 365):,.2f}
- Gas cost as % of balance: {(market_data['gas_cost_usd'] / (vb['total_usdc'] if vb else market_data['treasury_balance']) * 100) if (vb and vb['total_usdc'] > 0) or market_data['treasury_balance'] > 0 else 0:.4f}%
- Days to recover gas cost: {(market_data['gas_cost_usd'] / ((vb['total_usdc'] if vb else market_data['treasury_balance']) * market_data['aave_apy'] / 100 / 365)) if market_data['aave_apy'] > 0 and ((vb and vb['total_usdc'] > 0) or market_data['treasury_balance'] > 0) else float('inf'):.2f} days

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

Based on this data, should we DEPOSIT the treasury USDC into Aave or HOLD?
Analyze thoroughly and provide your recommendation in the required JSON format.
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
        """Main decision-making process powered by LLM."""
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

        # When decision is DEPOSIT, supply (supply_to_aave_percent)% of vault idle to Aave
        if llm_decision.get("decision") == "DEPOSIT" and self.supply_to_aave_percent > 0:
            logger.info(f"Decision is DEPOSIT. Attempting to supply {self.supply_to_aave_percent}% of vault idle to Aave...")
            result = self.execute_supply_to_aave(market_data)
            if result:
                logger.info("Successfully executed supplyToAave transaction")
            else:
                logger.warning("Failed to execute supplyToAave (check logs above for details)")

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

        report += """+-------------------------------------------------------------------------------+

+-- HISTORICAL SUMMARY --------------------------------------------------------+
| Total Decisions: """ + f"{len(self.decision_history):>3d}" + """
| DEPOSIT Recommendations: """ + f"{sum(1 for d in self.decision_history if d['llm_analysis']['decision'] == 'DEPOSIT'):>3d}" + """
| HOLD Recommendations:    """ + f"{sum(1 for d in self.decision_history if d['llm_analysis']['decision'] == 'HOLD'):>3d}" + """
| Average Confidence:      """ + f"{sum(d['llm_analysis'].get('confidence', 0) for d in self.decision_history) / len(self.decision_history) if self.decision_history else 0:>3.0f}%" + """
+-------------------------------------------------------------------------------+
"""
        
        return report
    
    def run(self, iterations: Optional[int] = None):
        """Run the LLM agent continuously or for specified iterations."""
        logger.info("Starting LLM-Powered Aave Yield Agent...")
        logger.info(f"Model: {self.model}")
        logger.info(f"Risk Tolerance: {self.risk_tolerance}")
        logger.info(f"Check interval: {self.check_interval} seconds")
        
        iteration = 0
        while iterations is None or iteration < iterations:
            try:
                # Make LLM-powered decision
                decision = self.make_decision()
                
                # Generate and display report
                report = self.generate_report()
                print(report)

                # Save decision history as JSON only (no .log or .txt files)
                with open('llm_decision_history.json', 'w') as f:
                    json.dump(self.decision_history, f, indent=2)
                
                iteration += 1
                
                # Wait before next check
                if iterations is None or iteration < iterations:
                    logger.info(f"Waiting {self.check_interval} seconds until next check...")
                    time.sleep(self.check_interval)
                    
            except KeyboardInterrupt:
                logger.info("Agent stopped by user")
                break
            except Exception as e:
                logger.error("Error in agent loop: %s", e, exc_info=True)
                time.sleep(60)


if __name__ == "__main__":
    import sys
    
    # All configuration loaded from .env via dotenv (load_dotenv() called at module level)
    # Required variables
    RPC_URL = os.getenv('BASE_SEPOLIA_RPC_URL', 'https://sepolia.base.org')
    TREASURY_ADDRESS = os.getenv('TREASURY_ADDRESS')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    YIELD_VAULT_ADDRESS = os.getenv('YIELD_VAULT_ADDRESS', '').strip()
    OPERATOR_PRIVATE_KEY = os.getenv('OPERATOR_PRIVATE_KEY', '').strip()
    
    # Validate required variables
    if not TREASURY_ADDRESS:
        logger.error("ERROR: TREASURY_ADDRESS not found in .env file")
        sys.exit(1)
    
    if not OPENAI_API_KEY:
        logger.error("ERROR: OPENAI_API_KEY not found in .env file")
        logger.error("Get your API key from: https://platform.openai.com/api-keys")
        sys.exit(1)
    
    # Optional configuration with defaults
    MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o')
    CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '300'))
    RISK_TOLERANCE = os.getenv('RISK_TOLERANCE', 'moderate').lower()
    SUPPLY_TO_AAVE_PERCENT = int(os.getenv('SUPPLY_TO_AAVE_PERCENT', '5'))
    DEFILLAMA_POOL_ID = os.getenv('DEFILLAMA_POOL_ID', '').strip()  # Optional: DefiLlama pool ID for historical data
    
    # Log configuration status
    logger.info("Configuration loaded from .env:")
    logger.info(f"  RPC_URL: {RPC_URL}")
    logger.info(f"  TREASURY_ADDRESS: {TREASURY_ADDRESS}")
    logger.info(f"  YIELD_VAULT_ADDRESS: {YIELD_VAULT_ADDRESS if YIELD_VAULT_ADDRESS else '(not set)'}")
    logger.info(f"  OPERATOR_PRIVATE_KEY: {'(set)' if OPERATOR_PRIVATE_KEY else '(not set - transactions disabled)'}")
    logger.info(f"  SUPPLY_TO_AAVE_PERCENT: {SUPPLY_TO_AAVE_PERCENT}%")
    logger.info(f"  MODEL: {MODEL}")
    logger.info(f"  RISK_TOLERANCE: {RISK_TOLERANCE}")
    logger.info(f"  DEFILLAMA_POOL_ID: {DEFILLAMA_POOL_ID if DEFILLAMA_POOL_ID else '(not set - will auto-detect)'}")

    if RISK_TOLERANCE not in ['conservative', 'moderate', 'aggressive']:
        logger.warning(f"Invalid risk tolerance '{RISK_TOLERANCE}', defaulting to 'moderate'")
        RISK_TOLERANCE = 'moderate'

    # Pass YIELD_VAULT_ADDRESS to agent (it will also read from env in __init__, but we pass it here for consistency)
    # Note: The agent's __init__ will also read YIELD_VAULT_ADDRESS from env, so this ensures consistency
    agent = LLMAaveYieldAgent(
        rpc_url=RPC_URL,
        treasury_address=TREASURY_ADDRESS,
        openai_api_key=OPENAI_API_KEY,
        model=MODEL,
        check_interval=CHECK_INTERVAL,
        risk_tolerance=RISK_TOLERANCE,
        supply_to_aave_percent=SUPPLY_TO_AAVE_PERCENT,
        operator_private_key=OPERATOR_PRIVATE_KEY or None,
    )
    
    # Verify vault address was loaded correctly
    if YIELD_VAULT_ADDRESS and not agent.vault_address:
        logger.warning(f"WARNING: YIELD_VAULT_ADDRESS '{YIELD_VAULT_ADDRESS}' may be invalid (not checksummed)")
    elif not YIELD_VAULT_ADDRESS:
        logger.warning("WARNING: YIELD_VAULT_ADDRESS not set in .env - vault balance monitoring disabled")
    
    logger.info("=" * 80)
    logger.info("LLM AGENT READY")
    logger.info("=" * 80)
    
    # Run indefinitely (or specify iterations for testing)
    agent.run()