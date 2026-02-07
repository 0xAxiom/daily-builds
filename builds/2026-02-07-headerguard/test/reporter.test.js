import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toJSON, toMarkdown } from '../src/reporter.js';
import { analyzeHeaders } from '../src/analyzer.js';

describe('toJSON', () => {
  it('returns valid JSON structure', () => {
    const analysis = analyzeHeaders({});
    const json = toJSON(analysis, 'https://example.com');

    assert.equal(json.url, 'https://example.com');
    assert.equal(typeof json.timestamp, 'string');
    assert.equal(typeof json.grade, 'string');
    assert.equal(typeof json.score, 'number');
    assert.equal(typeof json.maxScore, 'number');
    assert.equal(Array.isArray(json.headers), true);
    assert.equal(json.headers.length, 12);
  });

  it('includes TLS info when provided', () => {
    const analysis = analyzeHeaders({});
    const json = toJSON(analysis, 'https://example.com', {
      tls: { protocol: 'TLSv1.3', cipher: 'CHACHA20_POLY1305' }
    });
    assert.equal(json.tls.protocol, 'TLSv1.3');
  });

  it('serializes cleanly to JSON string', () => {
    const analysis = analyzeHeaders({});
    const json = toJSON(analysis, 'https://example.com');
    const str = JSON.stringify(json);
    const parsed = JSON.parse(str);
    assert.equal(parsed.url, 'https://example.com');
  });
});

describe('toMarkdown', () => {
  it('returns valid markdown', () => {
    const analysis = analyzeHeaders({});
    const md = toMarkdown(analysis, 'https://example.com');

    assert.equal(md.includes('# Security Header Audit'), true);
    assert.equal(md.includes('https://example.com'), true);
    assert.equal(md.includes('| Status |'), true);
    assert.equal(md.includes('Strict-Transport-Security'), true);
  });
});
