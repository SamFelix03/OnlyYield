#!/bin/bash

# Test script to deploy and test all functionalities
# Usage: ./scripts/test-all.sh

set -e

echo "=========================================="
echo "  YIELD STREAMER - COMPLETE TEST SUITE"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: PRIVATE_KEY not set in .env"
    exit 1
fi

# Check if Anvil is running
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo "ERROR: Anvil not running on localhost:8545"
    echo "Please start Anvil first with: anvil --fork-url \$SEPOLIA_RPC_URL"
    exit 1
fi

echo "[1/1] Running Complete Test Flow..."
forge script script/TestCompleteFlow.s.sol:TestCompleteFlow \
    --rpc-url http://localhost:8545 \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv

echo ""
echo "=========================================="
echo "  TEST SUITE COMPLETE"
echo "=========================================="
