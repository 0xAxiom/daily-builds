# ChainScan - Multi-Chain Wallet Scanner

## Overview
CLI tool that scans any EVM wallet across multiple chains simultaneously using Etherscan V2 API. Shows native balances, token holdings, and recent transactions in a single command.

## Problem
Checking wallet activity means opening block explorers for each chain separately. Agents managing wallets across Base, Ethereum, Arbitrum, Polygon need a unified view.

## Solution
Single CLI command: `chainscan 0x523E...` → formatted table of balances across all chains, top token holdings, and recent activity.

## Architecture
```
chainscan.mjs (single file, ~300 lines)
├── Multi-chain parallel fetch (Promise.allSettled)
├── Etherscan V2 API (single key, chainid param)
├── Native balance (eth_balance)
├── Token balances (tokentx → aggregate)
├── Recent txs (txlist, last 10)
└── Formatted terminal output (no deps)
```

## Tech
- **Runtime:** Node.js (ESM)
- **Dependencies:** None (zero-dep, uses native fetch)
- **API:** Etherscan V2 multichain (single API key)
- **Chains:** Ethereum (1), Base (8453), Arbitrum (42161), Polygon (137), Optimism (10)

## Features
1. `chainscan <address>` - Full scan across all chains
2. `chainscan <address> --chain base` - Single chain
3. `chainscan <address> --tokens` - Focus on token holdings
4. `chainscan <address> --txs` - Recent transactions
5. `chainscan <address> --json` - JSON output for piping

## Output Format
```
╔══════════════════════════════════════════════╗
║  ChainScan: 0x523E...dde5                   ║
╠══════════════════════════════════════════════╣
║  Chain      │ Native    │ USD Value          ║
║  Ethereum   │ 0.42 ETH  │ $1,050.00          ║
║  Base       │ 0.18 ETH  │ $450.00            ║
║  Arbitrum   │ 0.00 ETH  │ $0.00              ║
║  Polygon    │ 12.5 MATIC│ $15.00             ║
╠══════════════════════════════════════════════╣
║  Top Tokens (by value)                       ║
║  USDC       │ 4,700.00  │ Base               ║
║  WETH       │ 0.33      │ Base               ║
╠══════════════════════════════════════════════╣
║  Recent Activity (last 5)                    ║
║  Base  │ 2h ago │ Swap │ 0.1 ETH → USDC     ║
╚══════════════════════════════════════════════╝
```

## Files
- `chainscan.mjs` - Main CLI
- `README.md` - Documentation
- `test.mjs` - Tests
