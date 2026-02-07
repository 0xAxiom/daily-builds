/**
 * Server-specific fix suggestions for each security header.
 */

const FIXES = {
  'Strict-Transport-Security': {
    nginx: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`,
    apache: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});`,
    caddy: `header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`,
    cloudflare: `# Enable in Cloudflare Dashboard → SSL/TLS → Edge Certificates → HSTS
# Or via API: PATCH /zones/{zone_id}/settings/security_header`
  },

  'Content-Security-Policy': {
    nginx: `add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none';" always;`,
    apache: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none';"`,
    express: `const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    fontSrc: ["'self'"],
    frameAncestors: ["'none'"]
  }
}));`,
    caddy: `header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';"`,
    cloudflare: `# Add via Cloudflare Workers or Transform Rules
# Dashboard → Rules → Transform Rules → Modify Response Header`
  },

  'X-Content-Type-Options': {
    nginx: `add_header X-Content-Type-Options "nosniff" always;`,
    apache: `Header always set X-Content-Type-Options "nosniff"`,
    express: `app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});`,
    caddy: `header X-Content-Type-Options "nosniff"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header
# Set X-Content-Type-Options to "nosniff"`
  },

  'X-Frame-Options': {
    nginx: `add_header X-Frame-Options "DENY" always;`,
    apache: `Header always set X-Frame-Options "DENY"`,
    express: `app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});`,
    caddy: `header X-Frame-Options "DENY"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header
# Set X-Frame-Options to "DENY"`
  },

  'Referrer-Policy': {
    nginx: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
    apache: `Header always set Referrer-Policy "strict-origin-when-cross-origin"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});`,
    caddy: `header Referrer-Policy "strict-origin-when-cross-origin"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header
# Set Referrer-Policy to "strict-origin-when-cross-origin"`
  },

  'Permissions-Policy': {
    nginx: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;`,
    apache: `Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});`,
    caddy: `header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header
# Set Permissions-Policy to "camera=(), microphone=(), geolocation=(), payment=(), usb=()"`
  },

  'X-XSS-Protection': {
    nginx: `add_header X-XSS-Protection "0" always;`,
    apache: `Header always set X-XSS-Protection "0"`,
    express: `app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '0');
  next();
});`,
    caddy: `header X-XSS-Protection "0"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header
# Set X-XSS-Protection to "0" (disable buggy XSS auditor)`
  },

  'Cross-Origin-Opener-Policy': {
    nginx: `add_header Cross-Origin-Opener-Policy "same-origin" always;`,
    apache: `Header always set Cross-Origin-Opener-Policy "same-origin"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});`,
    caddy: `header Cross-Origin-Opener-Policy "same-origin"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header`
  },

  'Cross-Origin-Resource-Policy': {
    nginx: `add_header Cross-Origin-Resource-Policy "same-origin" always;`,
    apache: `Header always set Cross-Origin-Resource-Policy "same-origin"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});`,
    caddy: `header Cross-Origin-Resource-Policy "same-origin"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header`
  },

  'Cross-Origin-Embedder-Policy': {
    nginx: `add_header Cross-Origin-Embedder-Policy "require-corp" always;`,
    apache: `Header always set Cross-Origin-Embedder-Policy "require-corp"`,
    express: `app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});`,
    caddy: `header Cross-Origin-Embedder-Policy "require-corp"`,
    cloudflare: `# Dashboard → Rules → Transform Rules → Modify Response Header`
  },

  'Cache-Control': {
    nginx: `# For HTML/API responses (not static assets):
add_header Cache-Control "no-store" always;`,
    apache: `# For HTML/API responses:
Header always set Cache-Control "no-store"`,
    express: `// For sensitive routes:
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});`,
    caddy: `# For API/HTML routes:
header Cache-Control "no-store"`,
    cloudflare: `# Dashboard → Caching → Configuration
# Set Browser Cache TTL or add Page Rules`
  },

  'Server / X-Powered-By': {
    nginx: `server_tokens off;
# In http block: more_clear_headers Server;`,
    apache: `ServerTokens Prod
ServerSignature Off
Header unset X-Powered-By`,
    express: `app.disable('x-powered-by');
// Or use helmet: app.use(helmet.hidePoweredBy());`,
    caddy: `header -Server
header -X-Powered-By`,
    cloudflare: `# Server header is automatically masked by Cloudflare
# Remove X-Powered-By via Transform Rules`
  }
};

/**
 * Get fix suggestions for failing headers.
 * @param {Array} results - Analysis results
 * @param {string} server - Server type (nginx, apache, express, caddy, cloudflare)
 * @returns {Array} Fix suggestions
 */
export function getFixes(results, server = 'nginx') {
  const fixes = [];

  for (const result of results) {
    if (result.status === 'pass') continue;

    const headerFixes = FIXES[result.name];
    if (!headerFixes) continue;

    const fix = headerFixes[server] || headerFixes.nginx;
    fixes.push({
      header: result.name,
      status: result.status,
      detail: result.detail,
      config: fix,
      server
    });
  }

  return fixes;
}

export function getSupportedServers() {
  return ['nginx', 'apache', 'express', 'caddy', 'cloudflare'];
}
