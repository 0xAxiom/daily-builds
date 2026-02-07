# headerguard — HTTP Security Header Auditor

> "Grade your site's security headers in one command."

**Date:** February 7, 2026
**Author:** Axiom 🔬

## Overview

CLI tool that probes any URL and grades its HTTP security headers against OWASP best practices. Returns a letter grade (A+ to F) with specific, copy-pasteable fix suggestions for your web server.

## Problem

Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) are trivial to set but constantly forgotten. Pentest reports always flag them. Teams discover missing headers in production audits, months after deployment. There's no quick CLI tool that gives you an instant grade with actionable fixes.

## Architecture

```
┌─────────────────────────────────────────────┐
│                headerguard CLI               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Fetcher  │→ │ Analyzer │→ │ Reporter  │  │
│  │ (HTTP +   │  │ (rules   │  │ (table,   │  │
│  │  redirect │  │  engine)  │  │  JSON,    │  │
│  │  follow)  │  │          │  │  fixes)   │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │         Fix Generator                │    │
│  │  (nginx, apache, express, cloudflare │    │
│  │   caddy config snippets)             │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Components

### 1. Fetcher (`src/fetcher.js`)
- HTTP/HTTPS request with configurable redirect following
- Captures headers at each hop (HTTP→HTTPS, www→apex, etc.)
- Timeout handling, error reporting
- TLS version + cipher extraction

### 2. Analyzer (`src/analyzer.js`)
Rules engine checking 12 security headers:

| Header | Weight | Check |
|--------|--------|-------|
| Strict-Transport-Security | 15 | max-age ≥ 31536000, includeSubDomains, preload |
| Content-Security-Policy | 15 | present, no unsafe-inline/unsafe-eval in default-src |
| X-Content-Type-Options | 10 | nosniff |
| X-Frame-Options | 10 | DENY or SAMEORIGIN |
| Referrer-Policy | 10 | strict-origin-when-cross-origin or stricter |
| Permissions-Policy | 10 | present, restricts camera/mic/geolocation |
| X-XSS-Protection | 5 | 0 (modern) or 1; mode=block |
| Cross-Origin-Opener-Policy | 5 | same-origin |
| Cross-Origin-Resource-Policy | 5 | same-origin or same-site |
| Cross-Origin-Embedder-Policy | 5 | require-corp or credentialless |
| Cache-Control | 5 | no-store for sensitive, appropriate for static |
| Server/X-Powered-By | 5 | ABSENT (info leakage) |

Total: 100 points → letter grade

### 3. Reporter (`src/reporter.js`)
- Colored terminal table with pass/fail/warn per header
- Letter grade with color (A+=green, F=red)
- JSON output mode for CI/CD
- Markdown output mode for reports

### 4. Fix Generator (`src/fixes.js`)
- Per-header, per-server config snippets
- Supported: nginx, apache, express, caddy, cloudflare
- Copy-pasteable, tested configs

## CLI Interface

```bash
headerguard https://example.com          # Quick grade
headerguard --follow https://example.com # Audit each redirect hop
headerguard --fix nginx https://example.com # Show fix snippets
headerguard --compare url1 url2          # Side-by-side comparison
headerguard --json https://example.com   # Machine-readable output
headerguard --ci B https://example.com   # Exit 1 if below grade B
```

## Grading Scale

| Grade | Score | Color |
|-------|-------|-------|
| A+ | 95-100 | Bright Green |
| A | 85-94 | Green |
| B | 70-84 | Yellow |
| C | 50-69 | Orange |
| D | 30-49 | Red |
| F | 0-29 | Bright Red |

## Tech Stack

- Node.js 18+ (native fetch)
- `commander` — CLI parsing
- `chalk` — colored output
- `cli-table3` — tabular display
- Zero external API dependencies
