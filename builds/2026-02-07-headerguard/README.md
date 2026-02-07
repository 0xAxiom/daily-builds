# headerguard

Grade your site's HTTP security headers in one command.

```
$ headerguard github.com

  headerguard — https://github.com

    C    62/100 points  ████████████░░░░░░░░ 62%

  ✓  Strict-Transport-Security     15/15  Fully configured
  ✓  Content-Security-Policy       12/15  Contains 'unsafe-inline' without nonce
  ✓  X-Content-Type-Options        10/10  nosniff
  ✓  X-Frame-Options               10/10  DENY
  ⚠  Referrer-Policy                9/10  strict-origin-when-cross-origin
  ✗  Permissions-Policy             0/10  Missing
  ✓  X-XSS-Protection              5/5   Disabled (correct for modern browsers)
  ✗  Cross-Origin-Opener-Policy     0/5   Missing
  ✗  Cross-Origin-Resource-Policy   0/5   Missing
  ✗  Cross-Origin-Embedder-Policy   0/5   Missing
  ⚠  Cache-Control                  3/5   private (but may cache)
  ⚠  Server / X-Powered-By          4/5   Server: github.com

  TLS: TLSv1.3 | Cipher: TLS_AES_128_GCM_SHA256 | Issuer: Sectigo Limited
```

## Install

```bash
# Global
npm install -g headerguard

# Or run directly
npx headerguard https://your-site.com
```

## Usage

```bash
# Quick grade
headerguard example.com

# Follow redirects and audit each hop
headerguard --follow http://example.com

# Get fix suggestions for your web server
headerguard --fix nginx example.com
headerguard --fix express example.com
headerguard --fix apache example.com
headerguard --fix caddy example.com
headerguard --fix cloudflare example.com

# Compare two URLs (staging vs production)
headerguard --compare staging.example.com production.example.com

# CI/CD gate (exit 1 if below grade B)
headerguard --ci B example.com

# Machine-readable output
headerguard --json example.com
headerguard --markdown example.com
```

## What It Checks

12 security headers scored against OWASP best practices:

| Header | Weight | What It Protects Against |
|--------|--------|------------------------|
| Strict-Transport-Security | 15 | Protocol downgrade, cookie hijacking |
| Content-Security-Policy | 15 | XSS, data injection, clickjacking |
| X-Content-Type-Options | 10 | MIME-type sniffing attacks |
| X-Frame-Options | 10 | Clickjacking |
| Referrer-Policy | 10 | URL/data leakage via referrer |
| Permissions-Policy | 10 | Unauthorized feature access (camera, mic) |
| X-XSS-Protection | 5 | Legacy XSS auditor control |
| Cross-Origin-Opener-Policy | 5 | Cross-origin window references |
| Cross-Origin-Resource-Policy | 5 | Cross-origin resource loading |
| Cross-Origin-Embedder-Policy | 5 | Cross-origin isolation |
| Cache-Control | 5 | Sensitive data cached by browsers |
| Server / X-Powered-By | 5 | Server technology fingerprinting |

## Grading Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 95-100 | Excellent. All headers properly configured. |
| A | 85-94 | Great. Minor improvements possible. |
| B | 70-84 | Good. Some important headers missing. |
| C | 50-69 | Fair. Several security gaps. |
| D | 30-49 | Poor. Most protections missing. |
| F | 0-29 | Critical. Minimal security headers. |

## CI/CD Integration

```yaml
# GitHub Actions
- name: Security Header Check
  run: npx headerguard --ci B https://your-site.com

# Exit codes:
# 0 = grade meets threshold
# 1 = grade below threshold or error
```

```json
// JSON output for programmatic use
{
  "url": "https://example.com",
  "grade": "C",
  "score": 62,
  "maxScore": 100,
  "headers": [...]
}
```

## Fix Suggestions

Every failing header comes with copy-pasteable config for your web server:

```bash
$ headerguard --fix nginx your-site.com

  ✗ Permissions-Policy
    Missing. Browser features unrestricted.

    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;

  ✗ Cross-Origin-Opener-Policy
    Missing. Window can be referenced by cross-origin pages.

    add_header Cross-Origin-Opener-Policy "same-origin" always;
```

Supported: `nginx`, `apache`, `express`, `caddy`, `cloudflare`

## How It Works

1. Sends an HTTP HEAD request to the target URL
2. Extracts all response headers
3. Scores each security header against OWASP-aligned rules
4. Computes a weighted total (100 points max)
5. Maps to a letter grade (A+ through F)
6. Optionally generates server-specific fix configs

No API keys. No external services. Pure HTTP inspection.

## License

MIT

## Author

Built by [Axiom](https://github.com/0xAxiom) 🔬
