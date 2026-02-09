#!/usr/bin/env node

/**
 * ChainScan - Multi-Chain Wallet Scanner
 * Scans any EVM wallet across multiple chains using Etherscan V2 API
 * Zero dependencies, uses native Node.js fetch
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Chain configurations
const CHAINS = {
  ethereum: { id: 1, name: 'Ethereum', symbol: 'ETH', coingeckoId: 'ethereum' },
  base: { id: 8453, name: 'Base', symbol: 'ETH', coingeckoId: 'ethereum' },
  arbitrum: { id: 42161, name: 'Arbitrum', symbol: 'ETH', coingeckoId: 'ethereum' },
  polygon: { id: 137, name: 'Polygon', symbol: 'MATIC', coingeckoId: 'matic-network' },
  optimism: { id: 10, name: 'Optimism', symbol: 'ETH', coingeckoId: 'ethereum' }
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

// Box drawing characters
const box = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  cross: '╬',
  teeDown: '╦',
  teeUp: '╩',
  teeRight: '╠',
  teeLeft: '╣',
  line: '─',
  pipe: '│'
};

/**
 * Validate Ethereum address format
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format large numbers with commas
 */
function formatNumber(num, decimals = 2) {
  if (num === 0) return '0.00';
  if (num < 0.01) return '<0.01';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format balance from wei to ether
 */
function formatBalance(balance, decimals = 18) {
  const balanceNum = parseFloat(balance) / Math.pow(10, decimals);
  return balanceNum;
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make API request with retry logic
 */
async function apiRequest(url, retries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ChainScan/1.0.0'
        }
      });

      if (response.status === 429) {
        // Rate limited, wait and retry
        const delay = baseDelay * Math.pow(2, attempt);
        console.error(`${colors.yellow}Rate limited, retrying in ${delay}ms...${colors.reset}`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
}

/**
 * Get native balance for an address on a specific chain
 */
async function getNativeBalance(address, chainId, apiKey) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=balance&address=${address}&apikey=${apiKey}`;
  const response = await apiRequest(url);
  
  if (response.status !== '1') {
    throw new Error(response.message || 'Failed to fetch balance');
  }
  
  return response.result;
}

/**
 * Get token transfers for an address on a specific chain
 */
async function getTokenTransfers(address, chainId, apiKey) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=tokentx&address=${address}&page=1&offset=50&sort=desc&apikey=${apiKey}`;
  const response = await apiRequest(url);
  
  if (response.status !== '1') {
    return []; // No token transfers or error
  }
  
  return response.result || [];
}

/**
 * Get normal transactions for an address on a specific chain
 */
async function getNormalTransactions(address, chainId, apiKey) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&page=1&offset=10&sort=desc&apikey=${apiKey}`;
  const response = await apiRequest(url);
  
  if (response.status !== '1') {
    return []; // No transactions or error
  }
  
  return response.result || [];
}

/**
 * Aggregate token balances from token transfer history
 */
function aggregateTokenBalances(transfers) {
  const balances = new Map();
  
  // Process transfers to find the latest one for each token
  for (const transfer of transfers) {
    const key = `${transfer.contractAddress}-${transfer.tokenSymbol}`;
    const timestamp = parseInt(transfer.timeStamp);
    
    if (!balances.has(key) || balances.get(key).lastTimestamp < timestamp) {
      balances.set(key, {
        contractAddress: transfer.contractAddress,
        tokenName: transfer.tokenName,
        tokenSymbol: transfer.tokenSymbol,
        tokenDecimal: parseInt(transfer.tokenDecimal),
        lastValue: transfer.value,
        lastTimestamp: timestamp,
        isReceive: transfer.to.toLowerCase() !== transfer.from.toLowerCase()
      });
    }
  }
  
  return Array.from(balances.values())
    .map(token => ({
      ...token,
      balance: formatBalance(token.lastValue, token.tokenDecimal),
      lastActivity: new Date(token.lastTimestamp * 1000)
    }))
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
    .slice(0, 10); // Top 10 by recent activity
}

/**
 * Get cryptocurrency prices from CoinGecko
 */
async function getCryptoPrices() {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network&vs_currencies=usd';
    const response = await apiRequest(url);
    return {
      ethereum: response.ethereum?.usd || 0,
      'matic-network': response['matic-network']?.usd || 0
    };
  } catch (error) {
    console.error(`${colors.yellow}Warning: Could not fetch prices from CoinGecko${colors.reset}`);
    return { ethereum: 0, 'matic-network': 0 };
  }
}

/**
 * Scan a single chain
 */
async function scanChain(address, chainName, apiKey) {
  const chain = CHAINS[chainName];
  if (!chain) {
    throw new Error(`Unknown chain: ${chainName}`);
  }

  try {
    const [balance, tokenTransfers, normalTxs] = await Promise.allSettled([
      getNativeBalance(address, chain.id, apiKey),
      getTokenTransfers(address, chain.id, apiKey),
      getNormalTransactions(address, chain.id, apiKey)
    ]);

    const result = {
      chainName: chain.name,
      symbol: chain.symbol,
      coingeckoId: chain.coingeckoId,
      balance: balance.status === 'fulfilled' ? balance.value : null,
      error: balance.status === 'rejected' ? balance.reason.message : null,
      tokens: tokenTransfers.status === 'fulfilled' ? aggregateTokenBalances(tokenTransfers.value) : [],
      transactions: normalTxs.status === 'fulfilled' ? normalTxs.value.slice(0, 5) : []
    };

    return result;
  } catch (error) {
    return {
      chainName: chain.name,
      symbol: chain.symbol,
      coingeckoId: chain.coingeckoId,
      balance: null,
      error: error.message,
      tokens: [],
      transactions: []
    };
  }
}

/**
 * Format time ago
 */
function timeAgo(timestamp) {
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Draw a table with box drawing characters
 */
function drawTable(title, rows, colors = []) {
  const maxWidth = Math.max(title.length + 4, ...rows.map(row => row.join(' │ ').length + 4));
  
  let output = '';
  
  // Top border with title
  output += `${box.topLeft}${box.horizontal.repeat(maxWidth - 2)}${box.topRight}\n`;
  output += `${box.vertical} ${title.padEnd(maxWidth - 4)} ${box.vertical}\n`;
  
  if (rows.length > 0) {
    output += `${box.teeRight}${box.horizontal.repeat(maxWidth - 2)}${box.teeLeft}\n`;
    
    rows.forEach((row, index) => {
      const rowText = row.join(' │ ');
      const color = colors[index] || '';
      const reset = color ? colors.reset : '';
      output += `${box.vertical} ${color}${rowText.padEnd(maxWidth - 4)}${reset} ${box.vertical}\n`;
    });
  }
  
  // Bottom border
  output += `${box.bottomLeft}${box.horizontal.repeat(maxWidth - 2)}${box.bottomRight}\n`;
  
  return output;
}

/**
 * Output results in table format
 */
function outputTable(address, results, prices, options = {}) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  console.log(drawTable(`ChainScan: ${shortAddr}`, []));
  
  if (!options.tokens && !options.txs) {
    // Native balances table
    const balanceRows = [];
    const balanceColors = [];
    
    for (const result of results) {
      if (result.error) {
        balanceRows.push([result.chainName, 'Error', result.error]);
        balanceColors.push(colors.red);
      } else if (result.balance === null || result.balance === '0') {
        balanceRows.push([result.chainName, `0.00 ${result.symbol}`, '$0.00']);
        balanceColors.push(colors.gray);
      } else {
        const balance = formatBalance(result.balance);
        const price = prices[result.coingeckoId] || 0;
        const value = balance * price;
        
        balanceRows.push([
          result.chainName,
          `${formatNumber(balance, 4)} ${result.symbol}`,
          `$${formatNumber(value)}`
        ]);
        balanceColors.push(value > 0 ? colors.green : colors.gray);
      }
    }
    
    if (balanceRows.length > 0) {
      console.log('Native Balances:');
      balanceRows.forEach((row, index) => {
        const color = balanceColors[index];
        console.log(`${color}  ${row[0].padEnd(12)} │ ${row[1].padEnd(12)} │ ${row[2]}${colors.reset}`);
      });
      console.log();
    }
  }
  
  if (!options.txs) {
    // Token balances
    const allTokens = [];
    for (const result of results) {
      for (const token of result.tokens) {
        allTokens.push({ ...token, chain: result.chainName });
      }
    }
    
    if (allTokens.length > 0) {
      console.log('Token Holdings (by recent activity):');
      allTokens.slice(0, 10).forEach(token => {
        console.log(`${colors.cyan}  ${token.tokenSymbol.padEnd(8)} │ ${formatNumber(token.balance).padEnd(12)} │ ${token.chain}${colors.reset}`);
      });
      console.log();
    }
  }
  
  if (!options.tokens) {
    // Recent transactions
    const allTxs = [];
    for (const result of results) {
      for (const tx of result.transactions) {
        allTxs.push({ ...tx, chain: result.chainName });
      }
    }
    
    if (allTxs.length > 0) {
      allTxs.sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp));
      
      console.log('Recent Activity:');
      allTxs.slice(0, 5).forEach(tx => {
        const value = formatBalance(tx.value, 18);
        const time = timeAgo(parseInt(tx.timeStamp));
        const status = tx.isError === '0' ? '✓' : '✗';
        const statusColor = tx.isError === '0' ? colors.green : colors.red;
        
        console.log(`${colors.blue}  ${tx.chain.padEnd(8)} │ ${time.padEnd(8)} │ ${statusColor}${status}${colors.reset} ${formatNumber(value, 4)} ETH`);
      });
    }
  }
}

/**
 * Output results in JSON format
 */
function outputJSON(address, results, prices) {
  const output = {
    address,
    timestamp: new Date().toISOString(),
    chains: results.map(result => ({
      chain: result.chainName,
      symbol: result.symbol,
      balance: result.balance ? {
        raw: result.balance,
        formatted: formatBalance(result.balance),
        usd: result.balance ? formatBalance(result.balance) * (prices[result.coingeckoId] || 0) : 0
      } : null,
      error: result.error,
      tokens: result.tokens.map(token => ({
        name: token.tokenName,
        symbol: token.tokenSymbol,
        balance: token.balance,
        contractAddress: token.contractAddress,
        lastActivity: token.lastActivity
      })),
      recentTransactions: result.transactions.map(tx => ({
        hash: tx.hash,
        timestamp: parseInt(tx.timeStamp),
        value: formatBalance(tx.value),
        isError: tx.isError === '0' ? false : true,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice
      }))
    }))
  };
  
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`${colors.cyan}ChainScan - Multi-Chain Wallet Scanner${colors.reset}

${colors.yellow}Usage:${colors.reset}
  chainscan <address> [options]

${colors.yellow}Options:${colors.reset}
  --chain <name>    Scan single chain (ethereum|base|arbitrum|polygon|optimism)
  --tokens          Show only token holdings
  --txs             Show only recent transactions  
  --json            Output in JSON format
  --help            Show this help message

${colors.yellow}Environment:${colors.reset}
  ETHERSCAN_API_KEY    Your Etherscan API key (required)

${colors.yellow}Examples:${colors.reset}
  chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5
  chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --chain base
  chainscan 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5 --tokens --json
`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
  }
  
  const address = args[0];
  if (!isValidAddress(address)) {
    console.error(`${colors.red}Error: Invalid Ethereum address format${colors.reset}`);
    console.error('Expected format: 0x followed by 40 hexadecimal characters');
    process.exit(1);
  }
  
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.error(`${colors.red}Error: ETHERSCAN_API_KEY environment variable not set${colors.reset}`);
    console.error('Get your free API key at: https://etherscan.io/apis');
    process.exit(1);
  }
  
  // Parse options
  const options = {
    chain: null,
    tokens: args.includes('--tokens'),
    txs: args.includes('--txs'),
    json: args.includes('--json')
  };
  
  const chainIndex = args.findIndex(arg => arg === '--chain');
  if (chainIndex !== -1 && chainIndex + 1 < args.length) {
    const chainName = args[chainIndex + 1].toLowerCase();
    if (!CHAINS[chainName]) {
      console.error(`${colors.red}Error: Unknown chain '${chainName}'${colors.reset}`);
      console.error('Supported chains: ' + Object.keys(CHAINS).join(', '));
      process.exit(1);
    }
    options.chain = chainName;
  }
  
  try {
    console.log(`${colors.cyan}Scanning ${address}...${colors.reset}`);
    
    // Determine which chains to scan
    const chainsToScan = options.chain ? [options.chain] : Object.keys(CHAINS);
    
    // Fetch prices first, then stagger chain scans (Etherscan free tier = 5 req/sec)
    const priceData = await getCryptoPrices().catch(() => ({}));
    const results = [];
    for (const chain of chainsToScan) {
      const result = await scanChain(address, chain, apiKey);
      results.push(result);
      if (chainsToScan.length > 1) await sleep(1200); // stagger to avoid rate limits (free tier = 5 req/sec)
    }
    
    if (results.length === 0) {
      console.error(`${colors.red}Error: Failed to fetch data from any chain${colors.reset}`);
      process.exit(1);
    }
    
    // Output results
    if (options.json) {
      outputJSON(address, results, priceData);
    } else {
      outputTable(address, results, priceData, options);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { scanChain, isValidAddress, formatBalance, aggregateTokenBalances };