#!/usr/bin/env node

import { ethers } from 'ethers';
import chalk from 'chalk';
import fetch from 'node-fetch';

// Chain configurations
const CHAINS = {
  'base': { id: 8453, name: 'Base', explorer: 'basescan.org' },
  'eth': { id: 1, name: 'Ethereum', explorer: 'etherscan.io' },
  'polygon': { id: 137, name: 'Polygon', explorer: 'polygonscan.com' },
  'arb': { id: 42161, name: 'Arbitrum', explorer: 'arbiscan.io' }
};

// Known event signatures
const EVENT_SIGNATURES = {
  // ERC-20
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer(address indexed from, address indexed to, uint256 value)',
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval(address indexed owner, address indexed spender, uint256 value)',
  
  // Uniswap V2
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822': 'Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
  '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f': 'Mint(address indexed sender, uint256 amount0, uint256 amount1)',
  '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496': 'Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)',
  
  // Uniswap V3
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67': 'Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f': 'IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  '0x26f6a048ee9138f2c0ce266f322cb99228e8d619ae2bff30c67f8dcf9d2377b4': 'DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  
  // Uniswap V4 
  '0x00': 'PoolInitialized(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)',
  
  // WETH
  '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c': 'Deposit(address indexed dst, uint256 wad)',
  '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65': 'Withdrawal(address indexed src, uint256 wad)'
};

// Known method signatures (4byte.directory)
const METHOD_SIGNATURES = {
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0x7ff36ab5': 'swapExactETHForTokens(uint256,address[],address,uint256)',
  '0x18cbafe5': 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)',
  '0x38ed1739': 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)',
  '0x791ac947': 'swapExactTokensForETHSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)',
  '0xb6f9de95': 'swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)',
  '0x414bf389': 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
  '0xc04b8d59': 'exactInput(bytes,address,uint256,uint256,uint256)',
  '0xdb3e2198': 'exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
  '0x09b81346': 'exactOutput(bytes,address,uint256,uint256,uint256)',
  '0xac9650d8': 'multicall(bytes[])',
  '0x5ae401dc': 'multicall(uint256,bytes[])',
  '0xfc6f7865': 'unwrapWETH9(uint256,address)',
  '0x49404b7c': 'unwrapWETH9WithFee(uint256,address,uint256,address)',
  '0x12210e8a': 'refundETH()',
  '0x883164a4': 'sweepToken(address,uint256,address)',
  '0x42966c68': 'burn(uint256)',
  '0x219f5d17': 'increaseLiquidity((uint256,uint256,uint256,uint256,uint256))',
  '0x0c49ccbe': 'decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))'
};

// Address labels
const ADDRESS_LABELS = {
  '0x0000000000000000000000000000000000000000': 'Zero Address',
  '0x000000000000000000000000000000000000dead': 'Dead Address',
  '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
  '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'Uniswap V3 Router 2',
  '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
  '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': 'Uniswap Universal Router',
  '0xa0b86991c431c24b4b83c4ce95ebe4e8b4f4b9cf6': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC (Base)',
  '0x4200000000000000000000000000000000000006': 'WETH (Base)',
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI (Base)'
};

class EtherscanAPI {
  constructor(chainId) {
    this.chainId = chainId;
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    this.baseUrl = 'https://api.etherscan.io/v2/api';
  }

  async request(params) {
    const url = new URL(this.baseUrl);
    url.searchParams.set('chainid', this.chainId.toString());
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    if (this.apiKey) {
      url.searchParams.set('apikey', this.apiKey);
    }

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === '0' && data.message !== 'No transactions found') {
        throw new Error(`API Error: ${data.message || data.result}`);
      }
      
      return data.result;
    } catch (error) {
      console.error(`API request failed:`, error.message);
      throw error;
    }
  }

  async getTransaction(txHash) {
    return this.request({
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash
    });
  }

  async getTransactionReceipt(txHash) {
    return this.request({
      module: 'proxy',
      action: 'eth_getTransactionReceipt',
      txhash: txHash
    });
  }

  async getInternalTransactions(txHash) {
    try {
      return await this.request({
        module: 'account',
        action: 'txlistinternal',
        txhash: txHash
      });
    } catch (error) {
      // Internal transactions might not be available for all chains
      return [];
    }
  }
}

class TransactionDecoder {
  constructor(chainId) {
    this.api = new EtherscanAPI(chainId);
    this.chainId = chainId;
  }

  formatAddress(address) {
    if (!address || address === '0x') return 'N/A';
    
    const label = ADDRESS_LABELS[address.toLowerCase()];
    if (label) {
      return `${this.truncateAddress(address)} (${chalk.cyan(label)})`;
    }
    return this.truncateAddress(address);
  }

  truncateAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatValue(value, decimals = 18, symbol = 'ETH') {
    if (!value || value === '0x0') return '0';
    
    try {
      const wei = BigInt(value);
      if (wei === 0n) return '0';
      
      const divisor = BigInt(10 ** decimals);
      const wholePart = wei / divisor;
      const fractionalPart = wei % divisor;
      
      if (fractionalPart === 0n) {
        return `${wholePart.toString()} ${symbol}`;
      }
      
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      const trimmed = fractionalStr.replace(/0+$/, '');
      
      if (trimmed === '') {
        return `${wholePart.toString()} ${symbol}`;
      }
      
      return `${wholePart.toString()}.${trimmed} ${symbol}`;
    } catch (error) {
      return `${value} ${symbol}`;
    }
  }

  formatGasUsage(gasUsed, gasLimit) {
    const used = parseInt(gasUsed, 16);
    const limit = parseInt(gasLimit, 16);
    const percentage = ((used / limit) * 100).toFixed(1);
    
    let color = chalk.green;
    if (percentage > 80) color = chalk.red;
    else if (percentage > 60) color = chalk.yellow;
    
    return `${color(used.toLocaleString())} / ${limit.toLocaleString()} (${percentage}%)`;
  }

  decodeMethodCall(input) {
    if (!input || input.length < 10) {
      return { selector: 'N/A', name: 'Transfer/Deploy', params: [] };
    }
    
    const selector = input.slice(0, 10);
    const signature = METHOD_SIGNATURES[selector];
    
    if (signature) {
      const name = signature.split('(')[0];
      return { selector, name, signature, params: [] };
    }
    
    return { selector, name: 'Unknown Method', signature: null, params: [] };
  }

  parseEventLog(log) {
    const signature = EVENT_SIGNATURES[log.topics[0]];
    if (!signature) {
      return {
        type: 'Unknown Event',
        signature: log.topics[0],
        data: log
      };
    }

    const eventName = signature.split('(')[0];
    const decoded = this.decodeEventData(log, signature);
    
    return {
      type: eventName,
      signature: log.topics[0],
      contract: log.address,
      decoded,
      raw: log
    };
  }

  decodeEventData(log, signature) {
    try {
      const iface = new ethers.Interface([`event ${signature}`]);
      const decoded = iface.parseLog({
        topics: log.topics,
        data: log.data
      });
      
      return {
        name: decoded.name,
        args: Object.fromEntries(
          Object.entries(decoded.args).filter(([key]) => isNaN(key))
        )
      };
    } catch (error) {
      return {
        name: 'Failed to decode',
        args: {},
        error: error.message
      };
    }
  }

  async decode(txHash) {
    console.log(chalk.blue(`🔍 Fetching transaction data...`));
    
    try {
      // Fetch all transaction data in parallel
      const [transaction, receipt, internalTxs] = await Promise.all([
        this.api.getTransaction(txHash),
        this.api.getTransactionReceipt(txHash),
        this.api.getInternalTransactions(txHash)
      ]);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      return {
        transaction,
        receipt,
        internalTxs: internalTxs || [],
        events: receipt?.logs?.map(log => this.parseEventLog(log)) || []
      };
    } catch (error) {
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
  }

  formatOutput(data) {
    const { transaction: tx, receipt, internalTxs, events } = data;
    
    let output = '';
    
    // Header
    output += chalk.bold.blue(`🔗 Transaction ${tx.hash}\n`);
    output += chalk.gray('━'.repeat(80)) + '\n\n';
    
    // Basic Information
    output += chalk.bold.yellow(`📋 Basic Information\n`);
    output += `   From: ${this.formatAddress(tx.from)}\n`;
    output += `   To: ${this.formatAddress(tx.to)}\n`;
    output += `   Value: ${chalk.green(this.formatValue(tx.value))}\n`;
    
    if (receipt) {
      output += `   Gas: ${this.formatGasUsage(receipt.gasUsed, tx.gas)}\n`;
      output += `   Gas Price: ${this.formatValue(tx.gasPrice, 9, 'gwei')}\n`;
      
      const status = receipt.status === '0x1' ? '✅ Success' : '❌ Failed';
      output += `   Status: ${status}\n`;
      
      if (receipt.status === '0x0') {
        output += `   ${chalk.red('Transaction reverted')}\n`;
      }
    }
    
    output += `   Block: ${parseInt(tx.blockNumber, 16)}\n`;
    output += `   Nonce: ${parseInt(tx.nonce, 16)}\n\n`;
    
    // Method Called
    const method = this.decodeMethodCall(tx.input);
    output += chalk.bold.yellow(`🔧 Method Called\n`);
    output += `   Function: ${chalk.cyan(method.name)}\n`;
    output += `   Selector: ${method.selector}\n`;
    if (method.signature) {
      output += `   Signature: ${chalk.gray(method.signature)}\n`;
    }
    output += '\n';
    
    // Events
    if (events && events.length > 0) {
      output += chalk.bold.yellow(`📊 Events (${events.length})\n`);
      
      events.forEach((event, index) => {
        output += `   ${this.formatEvent(event, index + 1)}\n`;
      });
      output += '\n';
    }
    
    // Internal Transactions
    if (internalTxs && internalTxs.length > 0) {
      output += chalk.bold.yellow(`🔄 Internal Transactions (${internalTxs.length})\n`);
      
      internalTxs.slice(0, 10).forEach((itx, index) => {
        output += `   ${index + 1}. ${this.formatInternalTx(itx)}\n`;
      });
      
      if (internalTxs.length > 10) {
        output += `   ... and ${internalTxs.length - 10} more\n`;
      }
      output += '\n';
    }
    
    return output;
  }

  formatEvent(event) {
    let emoji = '📄';
    let description = event.type;
    
    if (event.type === 'Transfer' && event.decoded?.args) {
      emoji = '💸';
      const { from, to, value } = event.decoded.args;
      const amount = this.formatValue(value?.toString());
      description = `Transfer: ${amount}`;
      
      return `${emoji} ${chalk.cyan(description)}\n` +
             `      From: ${this.formatAddress(from)}\n` +
             `      To: ${this.formatAddress(to)}\n` +
             `      Contract: ${this.formatAddress(event.contract)}`;
    }
    
    if (event.type === 'Approval' && event.decoded?.args) {
      emoji = '✅';
      const { owner, spender, value } = event.decoded.args;
      const amount = this.formatValue(value?.toString());
      description = `Approval: ${amount}`;
      
      return `${emoji} ${chalk.cyan(description)}\n` +
             `      Owner: ${this.formatAddress(owner)}\n` +
             `      Spender: ${this.formatAddress(spender)}\n` +
             `      Contract: ${this.formatAddress(event.contract)}`;
    }
    
    if (event.type === 'Swap' && event.decoded?.args) {
      emoji = '🔄';
      description = `Swap (${event.signature.includes('V3') ? 'V3' : 'V2'})`;
      
      return `${emoji} ${chalk.cyan(description)}\n` +
             `      Contract: ${this.formatAddress(event.contract)}\n` +
             `      Details: ${chalk.gray(JSON.stringify(event.decoded.args, null, 8).slice(0, 200))}`;
    }
    
    // Generic event display
    return `${emoji} ${chalk.cyan(description)}\n` +
           `      Contract: ${this.formatAddress(event.contract)}\n` +
           `      Signature: ${chalk.gray(event.signature)}`;
  }

  formatInternalTx(itx) {
    const value = this.formatValue(itx.value);
    const from = this.formatAddress(itx.from);
    const to = this.formatAddress(itx.to);
    
    if (itx.isError === '1') {
      return `❌ ${chalk.red('Failed')}: ${value} from ${from} to ${to}`;
    }
    
    return `💰 ${value} from ${from} to ${to}`;
  }
}

function validateTxHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // Remove 0x prefix if present
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
  
  // Check if it's 64 hex characters
  return /^[0-9a-fA-F]{64}$/.test(cleanHash);
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(chalk.bold('txdecode - Ethereum Transaction Decoder\n'));
    console.log('Usage: node txdecode.mjs <tx-hash> [--chain <chain>]\n');
    console.log('Arguments:');
    console.log('  tx-hash                 Transaction hash to decode');
    console.log('  --chain, -c             Chain to use (base|eth|polygon|arb) [default: base]\n');
    console.log('Supported chains:');
    Object.entries(CHAINS).forEach(([key, chain]) => {
      console.log(`  ${key.padEnd(8)} ${chain.name} (${chain.id})`);
    });
    console.log('\nEnvironment variables:');
    console.log('  ETHERSCAN_API_KEY       Optional Etherscan API key for higher rate limits');
    console.log('\nExamples:');
    console.log('  node txdecode.mjs 0x1234...5678');
    console.log('  node txdecode.mjs 0x1234...5678 --chain eth');
    process.exit(0);
  }
  
  let txHash = null;
  let chain = 'base';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--chain' || arg === '-c') {
      if (i + 1 < args.length) {
        chain = args[i + 1];
        i++; // skip next argument
      }
    } else if (!txHash && !arg.startsWith('--')) {
      txHash = arg;
    }
  }
  
  if (!txHash) {
    console.error(chalk.red('Error: Transaction hash is required'));
    process.exit(1);
  }
  
  if (!validateTxHash(txHash)) {
    console.error(chalk.red('Error: Invalid transaction hash format'));
    console.error('Transaction hash must be 64 hex characters (with or without 0x prefix)');
    process.exit(1);
  }
  
  if (!CHAINS[chain]) {
    console.error(chalk.red(`Error: Unsupported chain '${chain}'`));
    console.error(`Supported chains: ${Object.keys(CHAINS).join(', ')}`);
    process.exit(1);
  }
  
  // Ensure hash has 0x prefix
  if (!txHash.startsWith('0x')) {
    txHash = '0x' + txHash;
  }
  
  return { txHash, chain };
}

async function main() {
  try {
    const { txHash, chain } = parseArgs();
    const chainConfig = CHAINS[chain];
    
    console.log(chalk.blue(`🌐 Using ${chainConfig.name} (${chainConfig.id})`));
    
    const decoder = new TransactionDecoder(chainConfig.id);
    const data = await decoder.decode(txHash);
    
    console.clear();
    console.log(decoder.formatOutput(data));
    
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}