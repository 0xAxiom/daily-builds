# txdecode Architecture

## Overview
`txdecode` is a CLI tool that takes Ethereum transaction hashes and decodes them into human-readable output. It provides comprehensive transaction analysis including gas costs, method calls, token transfers, DeFi operations, and more.

## Core Components

### 1. CLI Interface (`txdecode.mjs`)
- Single entry point executable
- Argument parsing for tx hash and chain selection
- Error handling and validation
- Beautiful terminal output formatting

### 2. API Client
- Etherscan V2 API integration (multichain support)
- Rate limiting and error handling
- Optional API key support (env var fallback)
- Concurrent requests for tx details, receipt, and internal txs

### 3. Transaction Decoder
- Main transaction details (from/to, value, gas, status)
- Method signature decoding (4byte.directory fallback)
- Event log parsing and decoding
- Internal transaction analysis

### 4. Event Decoders
Specialized decoders for common DeFi patterns:
- **ERC-20**: Transfer, Approval events
- **Uniswap V2**: Swap, Mint, Burn events
- **Uniswap V3**: Swap, Mint, Burn, IncreaseLiquidity, DecreaseLiquidity
- **Uniswap V4**: Hook-based operations
- **Generic**: Unknown event type handling

### 5. Output Formatter
- Color-coded terminal output using chalk
- Hierarchical information display
- Value formatting (ETH, USD estimates, percentages)
- Address labeling when possible

## Data Flow

```
1. CLI Input (tx hash + chain)
   ↓
2. Validate tx hash format
   ↓
3. Parallel API calls:
   - eth_getTransactionByHash
   - eth_getTransactionReceipt  
   - account/txlistinternal
   ↓
4. Process transaction data:
   - Basic tx info
   - Method decoding
   - Event log parsing
   - Internal tx analysis
   ↓
5. Format & display results
```

## Chain Support

| Chain | ID | Explorer |
|-------|----| ---------|
| Base | 8453 | basescan.org |
| Ethereum | 1 | etherscan.io |
| Polygon | 137 | polygonscan.com |
| Arbitrum | 42161 | arbiscan.io |

## Known Event Signatures

```javascript
const EVENT_SIGNATURES = {
  // ERC-20
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer(address,address,uint256)',
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval(address,address,uint256)',
  
  // Uniswap V2
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': 'Swap(address,uint256,uint256,uint256,uint256,address)',
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': 'Mint(address,uint256,uint256)',
  '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496': 'Burn(address,uint256,uint256,address)',
  
  // Uniswap V3  
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67': 'Swap(address,address,int256,int256,uint160,uint128,int24)',
  '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f': 'IncreaseLiquidity(uint256,uint128,uint256,uint256)',
  '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4': 'DecreaseLiquidity(uint256,uint128,uint256,uint256)'
};
```

## Error Handling

- Invalid tx hash format
- Transaction not found
- API rate limits
- Network failures
- Malformed response data
- Unknown event signatures (graceful degradation)

## Output Format

```
🔗 Transaction 0x1234...5678
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Basic Information
   From: 0xabc...def (Uniswap Router)
   To: 0x123...789 (USDC Contract)
   Value: 0.5 ETH (~$1,200)
   Gas: 150,000 / 200,000 (75%)
   Gas Price: 15 gwei
   Status: ✅ Success

🔧 Method Called
   Function: swapExactETHForTokens
   Selector: 0x7ff36ab5

📊 Events (3)
   💸 Transfer: 500 USDC
      From: 0x000...000 
      To: 0xabc...def
   
   🔄 Swap: ETH → USDC  
      Amount In: 0.5 ETH
      Amount Out: 500 USDC
      Router: Uniswap V2

🔄 Internal Transactions (1)
   ETH Transfer: 0.495 ETH → Uniswap Pair
```

## Dependencies

- `ethers`: Ethereum library for ABI decoding
- `chalk`: Terminal colors and styling  
- `node-fetch`: HTTP requests to APIs
- `commander` (optional): CLI argument parsing

## Performance Considerations

- Parallel API requests where possible
- Cache common ABIs and method signatures
- Graceful degradation for unknown events
- Rate limit awareness for free tier usage