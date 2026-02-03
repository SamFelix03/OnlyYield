#!/bin/bash

# Start Anvil with Sepolia fork
# Usage: ./scripts/start-anvil.sh

set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "ERROR: .env file not found!"
    exit 1
fi

# Check if SEPOLIA_RPC_URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "ERROR: SEPOLIA_RPC_URL not set in .env"
    exit 1
fi

echo "Starting Anvil with Sepolia fork..."
echo "RPC URL: $SEPOLIA_RPC_URL"
echo ""
echo "Anvil will run on: http://localhost:8545"
echo "Press Ctrl+C to stop"
echo ""

# Start Anvil with fork
anvil \
    --fork-url "$SEPOLIA_RPC_URL" \
    --fork-block-number latest \
    --host 0.0.0.0 \
    --port 8545 \
    --chain-id 11155111
