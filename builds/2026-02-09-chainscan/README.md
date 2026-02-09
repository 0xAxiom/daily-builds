# ChainScan

A zero-dependency Node.js CLI that scans any EVM wallet across multiple chains simultaneously using Etherscan V2 API.

## Features

- 🔍 **Multi-chain scanning** - Ethereum, Base, Arbitrum, Polygon, Optimism
- 💰 **Native balances** - ETH, MATIC with USD values via CoinGecko
- 🪙 **Token holdings** - Aggregated from transfer history, top 10 by activity
- 📊 **Recent transactions** - Last 5 transactions across all chains
- 🎨 **Clean terminal output** - Box-drawing tables with ANSI colors
- 📱 **JSON export** - Machine-readable format for integrations
- ⚡ **Zero dependencies** - Uses native Node.js fetch only
- 🔄 **Rate limit handling** - Exponential backoff for API limits
- 🛡️ **Error resilience** - Failed chains don't crash entire scan

## Installation

```bash
# Download the script
curl -O https://raw.githubusercontent.com/yourrepo/chainscan/main/chainscan.mjs

# Make it executable
chmod +x chainscan.mjs

# Optional: Add to PATH
sudo mv chainscan.mjs /usr/local/bin/chainscan
```

## Environment Setup

Get a free API key from [Etherscan.io](https://etherscan.io/apis) and set the environment variable:

```bash
export ETHERSCAN_API_KEY="your-api-key-here"

# Or create a .env file (not recommended for production)
echo "ETHERSCAN_API_KEY=your-api-key-here" > .env
```

## Usage

### Basic Scan (All Chains)
```bash
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5
```

### Single Chain
```bash
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --chain base
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --chain ethereum
```

### Filter Output
```bash
# Show only token holdings
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --tokens

# Show only recent transactions
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --txs
```

### JSON Output
```bash
# JSON format for scripts/integrations
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --json

# Combine with filters
chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --chain base --tokens --json
```

## Example Output

### Terminal Table Format
```
╔══════════════════════════════════════════════╗
║  ChainScan: 0x523E...dde5                   ║
╚══════════════════════════════════════════════╝

Native Balances:
  Ethereum     │ 0.4200 ETH   │ $1,050.00
  Base         │ 0.1800 ETH   │ $450.00
  Arbitrum     │ 0.0000 ETH   │ $0.00
  Polygon      │ 12.5000 MATIC│ $15.00
  Optimism     │ 0.0000 ETH   │ $0.00

Token Holdings (by recent activity):
  USDC     │ 4,700.00     │ Base
  WETH     │ 0.3300       │ Base
  USDT     │ 1,200.50     │ Ethereum
  UNI      │ 45.2500      │ Ethereum

Recent Activity:
  Base     │ 2h ago   │ ✓ 0.1000 ETH
  Ethereum │ 1d ago   │ ✓ 0.0500 ETH
  Base     │ 2d ago   │ ✓ 0.2000 ETH
```

### JSON Format
```json
{
  "address": "0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5",
  "timestamp": "2026-02-09T22:01:00.000Z",
  "chains": [
    {
      "chain": "Ethereum",
      "symbol": "ETH",
      "balance": {
        "raw": "420000000000000000",
        "formatted": 0.42,
        "usd": 1050.0
      },
      "tokens": [
        {
          "name": "USD Coin",
          "symbol": "USDC",
          "balance": 1200.5,
          "contractAddress": "0xA0b86a33E6441038C4D27e7Ad32c6F4B64f96F00"
        }
      ],
      "recentTransactions": [...]
    }
  ]
}
```

## Supported Chains

| Chain     | ID    | Symbol | API Endpoint                    |
|-----------|-------|--------|---------------------------------|
| Ethereum  | 1     | ETH    | api.etherscan.io                |
| Base      | 8453  | ETH    | api.etherscan.io (v2 multichain)|
| Arbitrum  | 42161 | ETH    | api.etherscan.io (v2 multichain)|
| Polygon   | 137   | MATIC  | api.etherscan.io (v2 multichain)|
| Optimism  | 10    | ETH    | api.etherscan.io (v2 multichain)|

## API Details

ChainScan uses Etherscan's V2 API which supports multiple chains with a single API key:

```
https://api.etherscan.io/v2/api?chainid=CHAIN&module=MODULE&action=ACTION&apikey=KEY
```

### API Calls Made (per chain)
- **Native balance**: `module=account&action=balance`
- **Token transfers**: `module=account&action=tokentx&page=1&offset=50&sort=desc`
- **Normal transactions**: `module=account&action=txlist&page=1&offset=10&sort=desc`

### Rate Limits
- Free plan: 5 calls/second, 100,000 calls/day
- ChainScan implements exponential backoff for rate limits
- Failed chains show inline errors without crashing

## Token Balance Calculation

ChainScan aggregates token balances from transfer history:

1. **Fetches** last 50 token transfers per chain
2. **Groups** by contract address and token symbol
3. **Takes** the most recent transfer value as current balance
4. **Sorts** by most recent activity (not balance size)
5. **Shows** top 10 most active tokens

> **Note**: This gives a "last seen" balance, not precise current balance. For exact balances, use dedicated tools like `cast balance`.

## Error Handling

- ❌ **Invalid address**: Validates 0x + 40 hex chars
- 🔑 **Missing API key**: Clear setup instructions
- 🚫 **Rate limits**: Exponential backoff (1s, 2s, 4s...)
- 🌐 **Network errors**: Retry logic with graceful failures
- ⛓️ **Chain failures**: Show error inline, continue with other chains

## Development

### Run Tests
```bash
node test.mjs
```

### Test with Real Data
```bash
ETHERSCAN_API_KEY=your_key ./chainscan.mjs 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5
```

### Code Structure
- **Single file**: `chainscan.mjs` (~300 lines)
- **Zero dependencies**: Native Node.js only
- **ESM modules**: Modern JavaScript imports
- **Parallel execution**: `Promise.allSettled` for multiple chains
- **Clean error handling**: Graceful degradation

## Limitations

- **Token balances**: "Last seen" from transfer history, not real-time
- **Price data**: Basic USD values from CoinGecko free tier
- **API limits**: Subject to Etherscan rate limiting
- **Node.js 18+**: Requires native fetch support

## License

MIT License - see LICENSE file

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `node test.mjs`
5. Submit a pull request

---

**Built with ❤️ for the Ethereum community**