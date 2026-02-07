import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFixes, getSupportedServers } from '../src/fixes.js';
import { analyzeHeaders } from '../src/analyzer.js';

describe('getFixes', () => {

  it('returns fixes for missing headers', () => {
    const analysis = analyzeHeaders({});
    const fixes = getFixes(analysis.results, 'nginx');
    // Should have fixes for most missing headers (Server/X-Powered-By passes when absent)
    assert.equal(fixes.length >= 8, true, `Expected >= 8 fixes, got ${fixes.length}`);
  });

  it('returns no fixes for perfect headers', () => {
    const headers = {
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'x-xss-protection': '0',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'cross-origin-embedder-policy': 'require-corp',
      'cache-control': 'no-store'
    };
    const analysis = analyzeHeaders(headers);
    const fixes = getFixes(analysis.results, 'nginx');
    assert.equal(fixes.length, 0);
  });

  it('generates fixes for all supported servers', () => {
    const analysis = analyzeHeaders({});
    for (const server of getSupportedServers()) {
      const fixes = getFixes(analysis.results, server);
      assert.equal(fixes.length > 0, true, `No fixes for ${server}`);
      for (const fix of fixes) {
        assert.equal(typeof fix.config, 'string');
        assert.equal(fix.config.length > 0, true);
      }
    }
  });

  it('returns supported servers list', () => {
    const servers = getSupportedServers();
    assert.equal(servers.includes('nginx'), true);
    assert.equal(servers.includes('express'), true);
    assert.equal(servers.includes('apache'), true);
    assert.equal(servers.includes('caddy'), true);
    assert.equal(servers.includes('cloudflare'), true);
  });
});
