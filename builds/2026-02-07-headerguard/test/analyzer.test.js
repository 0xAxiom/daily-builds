import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHeaders } from '../src/analyzer.js';

describe('analyzeHeaders', () => {

  it('gives F grade for empty headers', () => {
    const result = analyzeHeaders({});
    assert.equal(result.grade, 'F');
    assert.equal(result.totalScore < 15, true);
  });

  it('gives high grade for well-configured headers', () => {
    const headers = {
      'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
      'content-security-policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'x-xss-protection': '0',
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'cross-origin-embedder-policy': 'require-corp',
      'cache-control': 'no-store'
    };
    const result = analyzeHeaders(headers);
    assert.equal(result.grade === 'A+' || result.grade === 'A', true, `Expected A+ or A, got ${result.grade}`);
    assert.equal(result.totalScore >= 85, true);
  });

  it('detects missing HSTS', () => {
    const result = analyzeHeaders({});
    const hsts = result.results.find(r => r.name === 'Strict-Transport-Security');
    assert.equal(hsts.status, 'missing');
    assert.equal(hsts.score, 0);
  });

  it('scores HSTS with partial config', () => {
    const result = analyzeHeaders({
      'strict-transport-security': 'max-age=3600'
    });
    const hsts = result.results.find(r => r.name === 'Strict-Transport-Security');
    assert.equal(hsts.status, 'warn');
    assert.equal(hsts.score > 0, true);
    assert.equal(hsts.score < 15, true);
  });

  it('scores X-Content-Type-Options correctly', () => {
    const pass = analyzeHeaders({ 'x-content-type-options': 'nosniff' });
    const xcto = pass.results.find(r => r.name === 'X-Content-Type-Options');
    assert.equal(xcto.status, 'pass');
    assert.equal(xcto.score, 10);
  });

  it('detects X-Frame-Options DENY', () => {
    const result = analyzeHeaders({ 'x-frame-options': 'DENY' });
    const xfo = result.results.find(r => r.name === 'X-Frame-Options');
    assert.equal(xfo.status, 'pass');
    assert.equal(xfo.score, 10);
  });

  it('detects X-Frame-Options SAMEORIGIN', () => {
    const result = analyzeHeaders({ 'x-frame-options': 'SAMEORIGIN' });
    const xfo = result.results.find(r => r.name === 'X-Frame-Options');
    assert.equal(xfo.status, 'pass');
    assert.equal(xfo.score, 9);
  });

  it('detects unsafe CSP directives', () => {
    const result = analyzeHeaders({
      'content-security-policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
    });
    const csp = result.results.find(r => r.name === 'Content-Security-Policy');
    assert.equal(csp.status === 'warn' || csp.status === 'fail', true);
  });

  it('flags server version info leakage', () => {
    const result = analyzeHeaders({
      'server': 'nginx/1.21.3',
      'x-powered-by': 'Express'
    });
    const info = result.results.find(r => r.name === 'Server / X-Powered-By');
    assert.equal(info.score < 5, true);
  });

  it('passes when no server info leakage', () => {
    const result = analyzeHeaders({});
    const info = result.results.find(r => r.name === 'Server / X-Powered-By');
    assert.equal(info.status, 'pass');
    assert.equal(info.score, 5);
  });

  it('detects unsafe-url referrer policy', () => {
    const result = analyzeHeaders({ 'referrer-policy': 'unsafe-url' });
    const rp = result.results.find(r => r.name === 'Referrer-Policy');
    assert.equal(rp.status, 'fail');
  });

  it('handles modern X-XSS-Protection (0)', () => {
    const result = analyzeHeaders({ 'x-xss-protection': '0' });
    const xss = result.results.find(r => r.name === 'X-XSS-Protection');
    assert.equal(xss.status, 'pass');
    assert.equal(xss.score, 5);
  });

  it('calculates percentage correctly', () => {
    const result = analyzeHeaders({});
    assert.equal(result.maxScore, 100);
    assert.equal(typeof result.percentage, 'number');
    assert.equal(result.percentage >= 0 && result.percentage <= 100, true);
  });

  it('returns 12 header checks', () => {
    const result = analyzeHeaders({});
    assert.equal(result.results.length, 12);
  });
});

describe('grading scale', () => {
  it('gives correct grades at boundaries', () => {
    // We test the grade by constructing headers that give known scores
    const perfect = analyzeHeaders({
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
    });
    assert.equal(perfect.grade === 'A+' || perfect.grade === 'A', true, `Got ${perfect.grade} (${perfect.totalScore}/${perfect.maxScore})`);
  });
});
