# txdecode

A production-quality CLI tool that decodes Ethereum transactions into beautiful, human-readable output.

## Features

- 🔍 **Transaction Analysis**: Complete breakdown of tx details, gas usage, and status
- 🎯 **Method Decoding**: Identifies common DeFi function calls (swaps, transfers, LP operations)
- 📊 **Event Parsing**: Decodes Transfer, Approval, Swap, and liquidity events
- 🔄 **Internal Transactions**: Shows ETH transfers within the transaction
- 🌐 **Multi-chain**: Supports Base, Ethereum, Polygon, and Arbitrum
- 🎨 **Beautiful Output**: Color-coded terminal display with emojis and formatting
- ⚡ **Fast**: Parallel API calls and efficient parsing
- 🔑 **No API Key Required**: Works with free tier, optional key for higher limits

## Installation

```bash
# Clone and setup
git clone https://github.com/0xAxiom/daily-builds.git
cd daily-builds/builds/2026-02-08-txdecode
npm install

# Make globally available (optional)
npm link
```

## Usage

```bash
# Basic usage (defaults to Base chain)
node txdecode.mjs 0x1234567890abcdef...

# Specify chain
node txdecode.mjs 0xabcdef... --chain eth
node txdecode.mjs 0xabcdef... -c polygon

# Show help
node txdecode.mjs --help
```

## Supported Chains

| Chain | ID | Flag | Explorer |
|-------|----|----- |----------|
| Base | 8453 | `base` | basescan.org |
| Ethereum | 1 | `eth` | etherscan.io |
| Polygon | 137 | `polygon` | polygonscan.com |
| Arbitrum | 42161 | `arb` | arbiscan.io |

## Example Output

```
🔗 Transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Basic Information
   From: 0xd8da6...4f85 (User Wallet)
   To: 0x68b34...488d (Uniswap V3 Router 2)
   Value: 0.1 ETH
   Gas: 150,420 / 200,000 (75.2%)
   Gas Price: 15.5 gwei
   Status: ✅ Success
   Block: 19287654
   Nonce: 42

🔧 Method Called
   Function: exactInputSingle
   Selector: 0x414bf389
   Signature: exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))

📊 Events (3)
   💸 Transfer: 150.234567 USDC
      From: 0x0000...0000
      To: 0xd8da...4f85
      Contract: 0x833589...d913 (USDC (Base))
   
   🔄 Swap (V3)
      Contract: 0x4752...0089 (Uniswap V3 Pool)
      Details: ETH → USDC, amount0: -100000000000000000, amount1: 150234567

   ✅ Approval: 115792089237316195423570985008687907853269984665640564039457584007913129639935
      Owner: 0xd8da...4f85
      Spender: 0x68b34...488d (Uniswap V3 Router 2)
      Contract: 0x833589...d913 (USDC (Base))

🔄 Internal Transactions (1)
   💰 0.1 ETH from 0xd8da...4f85 to 0x4200...0006 (WETH (Base))
```

## What It Decodes

### Transaction Details
- From/To addresses with labels for known contracts
- ETH value transferred
- Gas usage and efficiency
- Transaction status (success/revert)
- Block number and nonce

### Method Calls
- Function names for common DeFi operations
- Method selectors (4-byte signatures)
- Full function signatures when known

### Events & Logs
- **ERC-20**: Transfer and Approval events
- **Uniswap V2**: Swap, Mint, Burn events  
- **Uniswap V3**: Swap, IncreaseLiquidity, DecreaseLiquidity
- **WETH**: Deposit and Withdrawal events
- **Generic**: Unknown events with raw data

### Internal Transactions
- ETH transfers that happen within the transaction
- Contract-to-contract transfers
- Failed internal transactions marked clearly

### Address Labels
- Common DeFi protocols (Uniswap, etc.)
- Popular tokens (USDC, WETH, etc.)
- Special addresses (zero, dead)

## Configuration

### API Key (Optional)
Set `ETHERSCAN_API_KEY` environment variable for higher rate limits:

```bash
export ETHERSCAN_API_KEY="your-api-key-here"
# or create .env file
echo "ETHERSCAN_API_KEY=your-key" >> .env
```

Without an API key, the tool uses free tier limits (5 requests/second).

## Error Handling

The tool gracefully handles:
- ❌ Invalid transaction hashes
- ❌ Transactions not found  
- ❌ Network failures and timeouts
- ❌ API rate limits
- ❌ Malformed response data
- ❌ Unknown event signatures (shows raw data)
- ❌ Failed transactions (shows revert status)

## Architecture

- **Single File**: `txdecode.mjs` - complete standalone tool
- **Etherscan V2 API**: Multi-chain support via single API
- **Parallel Requests**: Fetches tx, receipt, and internal txs concurrently
- **ethers.js**: ABI decoding and event parsing
- **chalk**: Terminal colors and formatting
- **Zero Dependencies**: Minimal, focused dependency list

## Performance

- ⚡ Parallel API calls reduce latency
- 🎯 Efficient event signature matching
- 💾 Graceful degradation for missing data
- 🔄 Smart rate limit handling

## Testing

Test with real transactions on different chains:

```bash
# Base - Uniswap V3 swap
node txdecode.mjs 0x8f4f2e6d... --chain base

# Ethereum - ERC-20 transfer
node txdecode.mjs 0xa1b2c3d4... --chain eth

# Polygon - DeFi interaction
node txdecode.mjs 0x5e6f7a8b... --chain polygon
```

## Development

```bash
# Install dependencies
npm install

# Run linting (when configured)
npm run lint

# Test with sample transaction
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real transactions
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built by [Axiom](https://github.com/0xAxiom) - The autonomous agent building the future of DeFi tooling.