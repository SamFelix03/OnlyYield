"""
Read where the application holds USDC: outside Aave vs inside Aave.

- OUTSIDE Aave = USDC sitting in the YieldVault contract (idle), not supplied.
- INSIDE Aave  = USDC that has been supplied to Aave (vault's aToken balance).

Source: YieldVault on Base Sepolia. Set YIELD_VAULT_ADDRESS if you use a different deployment.
"""

import os

from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

# Base Sepolia – from .env or defaults
VAULT_ADDRESS = os.getenv("YIELD_VAULT_ADDRESS", "0x9a8a9f2C29b0B4B1eB2dF330cD7Ed3BDb9fe9c32")
BASE_SEPOLIA_RPC = os.getenv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org")

# Minimal ABI for reading vault balance (view functions only)
VAULT_ABI = [
    {
        "inputs": [],
        "name": "totalAssets",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "idleUnderlying",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "aTokenBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "asset",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
]


def main():
    w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))
    if not w3.is_connected():
        print(f"Failed to connect to Base Sepolia RPC: {BASE_SEPOLIA_RPC}")
        return 1

    vault_address = Web3.to_checksum_address(VAULT_ADDRESS)
    code = w3.eth.get_code(vault_address)
    if not code or code == b"":
        print(f"No contract at {VAULT_ADDRESS} on this RPC.")
        print("Set YIELD_VAULT_ADDRESS to your deployed YieldVault address (see deploy.log or deploy script output).")
        return 1

    vault = w3.eth.contract(address=vault_address, abi=VAULT_ABI)

    total_assets = vault.functions.totalAssets().call()
    idle = vault.functions.idleUnderlying().call()
    a_token_balance = vault.functions.aTokenBalance().call()

    # USDC on Base Sepolia uses 6 decimals
    decimals = 6
    outside_aave_human = idle / (10**decimals)           # idle in vault = not in Aave
    inside_aave_human = a_token_balance / (10**decimals) # supplied to Aave
    total_human = total_assets / (10**decimals)           # outside + inside

    print("YieldVault — where the application holds USDC (Base Sepolia)")
    print("=" * 55)
    print(f"Vault: {VAULT_ADDRESS}")
    print()
    print("  OUTSIDE Aave (idle in vault):  {:>12,.6f} USDC".format(outside_aave_human))
    print("  INSIDE Aave (supplied):        {:>12,.6f} USDC".format(inside_aave_human))
    print("  " + "-" * 45)
    print("  Total (application total):     {:>12,.6f} USDC".format(total_human))
    print("=" * 55)
    return 0


if __name__ == "__main__":
    exit(main())
