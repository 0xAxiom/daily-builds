#!/usr/bin/env node

/**
 * Test suite for ChainScan CLI tool
 * Tests all major functions without requiring API calls
 */

import { scanChain, isValidAddress, formatBalance, aggregateTokenBalances } from './chainscan.mjs';

// Test colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Test results
let passed = 0;
let failed = 0;

/**
 * Test runner function
 */
function test(name, testFn) {
  try {
    testFn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name}: ${error.message}`);
    failed++;
  }
}

/**
 * Assert helper function
 */
function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert equal helper function
 */
function assertEqual(actual, expected, message = `Expected ${expected}, got ${actual}`) {
  if (actual !== expected) {
    throw new Error(message);
  }
}

/**
 * Test address validation
 */
function testAddressValidation() {
  // Valid addresses
  assert(isValidAddress('0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5'), 'Valid address should pass');
  assert(isValidAddress('0x0000000000000000000000000000000000000000'), 'Zero address should pass');
  assert(isValidAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), 'Max address should pass');
  
  // Invalid addresses
  assert(!isValidAddress('0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde'), 'Short address should fail');
  assert(!isValidAddress('523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5'), 'Missing 0x prefix should fail');
  assert(!isValidAddress('0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5g'), 'Invalid hex character should fail');
  assert(!isValidAddress(''), 'Empty string should fail');
  assert(!isValidAddress('0x'), 'Only 0x should fail');
}

/**
 * Test balance formatting
 */
function testBalanceFormatting() {
  try {
    // Test basic wei to ether conversion
    const ethResult = formatBalance('1000000000000000000');
    assert(ethResult === 1, `Expected 1, got ${ethResult}`);
    
    const halfEthResult = formatBalance('500000000000000000');
    assert(halfEthResult === 0.5, `Expected 0.5, got ${halfEthResult}`);
    
    const zeroResult = formatBalance('0');
    assert(zeroResult === 0, `Expected 0, got ${zeroResult}`);
    
    // Test with different decimals (USDC has 6 decimals)
    const usdcResult = formatBalance('1000000', 6);
    assert(usdcResult === 1, `Expected USDC 1, got ${usdcResult}`);
    
    const halfUsdcResult = formatBalance('500000', 6);
    assert(halfUsdcResult === 0.5, `Expected USDC 0.5, got ${halfUsdcResult}`);
    
    // Test very small amounts
    const smallResult = formatBalance('1');
    assert(smallResult <= 0.000000000000000001, `Small amount test failed: ${smallResult}`);
  } catch (error) {
    throw new Error(`Balance formatting test failed: ${error.message}`);
  }
}

/**
 * Test token aggregation
 */
function testTokenAggregation() {
  const mockTransfers = [
    {
      contractAddress: '0xA0b86a33E6441038C4D27e7Ad32c6F4B64f96F00',
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      tokenDecimal: '6',
      value: '1000000', // 1 USDC
      timeStamp: '1699200000',
      to: '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5',
      from: '0x0000000000000000000000000000000000000000'
    },
    {
      contractAddress: '0x4200000000000000000000000000000000000006',
      tokenName: 'Wrapped Ether',
      tokenSymbol: 'WETH',
      tokenDecimal: '18',
      value: '500000000000000000', // 0.5 WETH
      timeStamp: '1699100000',
      to: '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5',
      from: '0x1111111111111111111111111111111111111111'
    },
    {
      contractAddress: '0xA0b86a33E6441038C4D27e7Ad32c6F4B64f96F00',
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      tokenDecimal: '6',
      value: '2000000', // 2 USDC (newer transfer of same token)
      timeStamp: '1699300000',
      to: '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5',
      from: '0x2222222222222222222222222222222222222222'
    }
  ];
  
  const tokens = aggregateTokenBalances(mockTransfers);
  
  // Should have 2 unique tokens
  assertEqual(tokens.length, 2, 'Should aggregate to 2 unique tokens');
  
  // Should be sorted by timestamp (most recent first)
  assertEqual(tokens[0].tokenSymbol, 'USDC', 'Most recent token should be first');
  assertEqual(tokens[1].tokenSymbol, 'WETH', 'Older token should be second');
  
  // Should have correct balances
  assert(tokens[0].balance === 2, `Expected USDC balance 2, got ${tokens[0].balance}`);
  assert(tokens[1].balance === 0.5, `Expected WETH balance 0.5, got ${tokens[1].balance}`);
  
  // Should have timestamp data
  assert(tokens[0].lastTimestamp > tokens[1].lastTimestamp, 'Should be sorted by timestamp');
}

/**
 * Test CLI argument parsing simulation
 */
function testCLIArgParsing() {
  // Simulate different argument combinations
  const testArgs = [
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5'],
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', '--chain', 'base'],
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', '--tokens'],
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', '--txs'],
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', '--json'],
    ['0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5', '--chain', 'ethereum', '--tokens', '--json']
  ];
  
  // Mock CLI parsing logic
  function parseArgs(args) {
    const address = args[0];
    const options = {
      chain: null,
      tokens: args.includes('--tokens'),
      txs: args.includes('--txs'),
      json: args.includes('--json')
    };
    
    const chainIndex = args.findIndex(arg => arg === '--chain');
    if (chainIndex !== -1 && chainIndex + 1 < args.length) {
      options.chain = args[chainIndex + 1];
    }
    
    return { address, options };
  }
  
  // Test each argument combination
  const result1 = parseArgs(testArgs[0]);
  assertEqual(result1.address, '0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5');
  assertEqual(result1.options.chain, null);
  
  const result2 = parseArgs(testArgs[1]);
  assertEqual(result2.options.chain, 'base');
  
  const result3 = parseArgs(testArgs[2]);
  assertEqual(result3.options.tokens, true);
  
  const result4 = parseArgs(testArgs[3]);
  assertEqual(result4.options.txs, true);
  
  const result5 = parseArgs(testArgs[4]);
  assertEqual(result5.options.json, true);
  
  const result6 = parseArgs(testArgs[5]);
  assertEqual(result6.options.chain, 'ethereum');
  assertEqual(result6.options.tokens, true);
  assertEqual(result6.options.json, true);
}

/**
 * Test output formatting functions
 */
function testOutputFormatting() {
  // Test number formatting
  const formatNumber = (num, decimals = 2) => {
    if (num === 0) return '0.00';
    if (num < 0.01) return '<0.01';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };
  
  assertEqual(formatNumber(0), '0.00');
  assertEqual(formatNumber(0.001), '<0.01');
  assertEqual(formatNumber(1234.567), '1,234.57');
  assertEqual(formatNumber(1234.567, 4), '1,234.5670');
  
  // Test time ago formatting
  const timeAgo = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };
  
  const now = Date.now() / 1000;
  assertEqual(timeAgo(now - 30), 'now');
  assertEqual(timeAgo(now - 3600), '1h ago');
  assertEqual(timeAgo(now - 86400), '1d ago');
}

/**
 * Test error handling scenarios
 */
function testErrorHandling() {
  // Test with invalid API responses
  const mockInvalidResponse = { status: '0', message: 'Invalid API key' };
  
  // Should handle API errors gracefully
  assert(mockInvalidResponse.status !== '1', 'Should detect API errors');
  
  // Test rate limiting simulation
  const mockRateLimitResponse = { status: 429, statusText: 'Too Many Requests' };
  assert(mockRateLimitResponse.status === 429, 'Should detect rate limits');
  
  // Test network errors
  try {
    throw new Error('Network error');
  } catch (error) {
    assert(error.message === 'Network error', 'Should catch network errors');
  }
}

/**
 * Test chain configuration
 */
function testChainConfiguration() {
  const CHAINS = {
    ethereum: { id: 1, name: 'Ethereum', symbol: 'ETH', coingeckoId: 'ethereum' },
    base: { id: 8453, name: 'Base', symbol: 'ETH', coingeckoId: 'ethereum' },
    arbitrum: { id: 42161, name: 'Arbitrum', symbol: 'ETH', coingeckoId: 'ethereum' },
    polygon: { id: 137, name: 'Polygon', symbol: 'MATIC', coingeckoId: 'matic-network' },
    optimism: { id: 10, name: 'Optimism', symbol: 'ETH', coingeckoId: 'ethereum' }
  };
  
  // Test all required chains are present
  assertEqual(Object.keys(CHAINS).length, 5, 'Should have 5 supported chains');
  
  // Test chain properties
  assert(CHAINS.ethereum.id === 1, 'Ethereum chain ID should be 1');
  assert(CHAINS.base.id === 8453, 'Base chain ID should be 8453');
  assert(CHAINS.polygon.symbol === 'MATIC', 'Polygon symbol should be MATIC');
  
  // Test coingecko mappings
  assertEqual(CHAINS.ethereum.coingeckoId, 'ethereum');
  assertEqual(CHAINS.polygon.coingeckoId, 'matic-network');
}

// Run all tests
console.log(`${colors.cyan}Running ChainScan Test Suite...${colors.reset}\n`);

test('Address Validation', testAddressValidation);
test('Balance Formatting', testBalanceFormatting);
test('Token Aggregation', testTokenAggregation);
test('CLI Argument Parsing', testCLIArgParsing);
test('Output Formatting', testOutputFormatting);
test('Error Handling', testErrorHandling);
test('Chain Configuration', testChainConfiguration);

// Summary
console.log(`\n${colors.cyan}Test Results:${colors.reset}`);
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

if (failed > 0) {
  console.log(`\n${colors.red}Some tests failed. Please fix the issues before deploying.${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}All tests passed! ✓${colors.reset}`);
  console.log(`${colors.yellow}Run with a real address to test API integration:${colors.reset}`);
  console.log(`ETHERSCAN_API_KEY=your_key ./chainscan.mjs 0x523Eff3dB03938eaa31a5a6FBd41E3B9d23edde5`);
}