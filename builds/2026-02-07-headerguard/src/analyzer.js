/**
 * Security header analysis engine.
 * Each rule returns: { name, status, score, maxScore, detail, fix }
 */

const RULES = [
  {
    name: 'Strict-Transport-Security',
    key: 'strict-transport-security',
    maxScore: 15,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Header not set. Site vulnerable to protocol downgrade attacks.' };
      }
      let score = 5; // Present
      const parts = value.toLowerCase();
      const maxAgeMatch = parts.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0;

      if (maxAge >= 31536000) score += 5; // 1 year
      else if (maxAge >= 15768000) score += 3; // 6 months
      else score += 1;

      if (parts.includes('includesubdomains')) score += 3;
      if (parts.includes('preload')) score += 2;

      const details = [];
      if (maxAge < 31536000) details.push(`max-age=${maxAge} (recommended: 31536000)`);
      if (!parts.includes('includesubdomains')) details.push('Missing includeSubDomains');
      if (!parts.includes('preload')) details.push('Missing preload');

      return {
        status: score >= 13 ? 'pass' : 'warn',
        score: Math.min(score, 15),
        detail: details.length ? details.join('; ') : 'Fully configured',
        value
      };
    }
  },
  {
    name: 'Content-Security-Policy',
    key: 'content-security-policy',
    maxScore: 15,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'No CSP. Site vulnerable to XSS and data injection.' };
      }
      let score = 8; // Present is already good
      const lower = value.toLowerCase();
      const issues = [];

      if (lower.includes("'unsafe-inline'") && !lower.includes("'nonce-")) {
        score -= 3;
        issues.push("Contains 'unsafe-inline' without nonce");
      }
      if (lower.includes("'unsafe-eval'")) {
        score -= 3;
        issues.push("Contains 'unsafe-eval'");
      }
      if (lower.includes('default-src')) score += 3;
      if (lower.includes('script-src')) score += 2;
      if (lower.includes('frame-ancestors')) score += 2;

      return {
        status: score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail',
        score: Math.min(Math.max(score, 0), 15),
        detail: issues.length ? issues.join('; ') : 'CSP configured',
        value: value.length > 100 ? value.substring(0, 97) + '...' : value
      };
    }
  },
  {
    name: 'X-Content-Type-Options',
    key: 'x-content-type-options',
    maxScore: 10,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Browser may MIME-sniff responses.' };
      }
      if (value.toLowerCase().trim() === 'nosniff') {
        return { status: 'pass', score: 10, detail: 'nosniff', value };
      }
      return { status: 'warn', score: 3, detail: `Unexpected value: ${value}`, value };
    }
  },
  {
    name: 'X-Frame-Options',
    key: 'x-frame-options',
    maxScore: 10,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Site can be embedded in iframes (clickjacking risk).' };
      }
      const v = value.toUpperCase().trim();
      if (v === 'DENY') return { status: 'pass', score: 10, detail: 'DENY', value };
      if (v === 'SAMEORIGIN') return { status: 'pass', score: 9, detail: 'SAMEORIGIN', value };
      if (v.startsWith('ALLOW-FROM')) return { status: 'warn', score: 5, detail: 'ALLOW-FROM is deprecated', value };
      return { status: 'warn', score: 3, detail: `Unexpected value: ${value}`, value };
    }
  },
  {
    name: 'Referrer-Policy',
    key: 'referrer-policy',
    maxScore: 10,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Full referrer URL leaked on navigation.' };
      }
      const bad = ['unsafe-url'];
      // Handle comma-separated policies (browser uses last valid one)
      const policies = value.toLowerCase().split(',').map(s => s.trim());
      const v = policies[policies.length - 1]; // Browser uses last

      if (v === 'no-referrer' || v === 'same-origin') return { status: 'pass', score: 10, detail: v, value };
      if (v === 'strict-origin-when-cross-origin' || v === 'strict-origin') return { status: 'pass', score: 9, detail: v, value };
      if (v === 'no-referrer-when-downgrade') return { status: 'pass', score: 7, detail: v, value };
      if (v === 'origin-when-cross-origin' || v === 'origin') return { status: 'warn', score: 5, detail: v, value };
      if (bad.includes(v)) return { status: 'fail', score: 1, detail: `${v} — leaks full URL`, value };
      return { status: 'warn', score: 3, detail: `Unexpected: ${value}`, value };
    }
  },
  {
    name: 'Permissions-Policy',
    key: 'permissions-policy',
    maxScore: 10,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Browser features (camera, mic, geolocation) unrestricted.' };
      }
      let score = 5;
      const lower = value.toLowerCase();

      // Check for restrictive policies
      const restrictedFeatures = ['camera', 'microphone', 'geolocation', 'payment', 'usb'];
      let restricted = 0;
      for (const feat of restrictedFeatures) {
        if (lower.includes(`${feat}=()`)) restricted++;
      }
      score += Math.min(restricted * 1, 5);

      return {
        status: score >= 8 ? 'pass' : 'warn',
        score: Math.min(score, 10),
        detail: `${restricted}/${restrictedFeatures.length} sensitive features restricted`,
        value: value.length > 80 ? value.substring(0, 77) + '...' : value
      };
    }
  },
  {
    name: 'X-XSS-Protection',
    key: 'x-xss-protection',
    maxScore: 5,
    analyze(value) {
      if (!value) {
        return { status: 'warn', score: 2, detail: 'Not set (modern browsers ignore this, but legacy browsers benefit).' };
      }
      const v = value.trim();
      // Modern recommendation: set to 0 (disable buggy XSS auditor)
      if (v === '0') return { status: 'pass', score: 5, detail: 'Disabled (correct for modern browsers)', value };
      if (v === '1; mode=block') return { status: 'pass', score: 4, detail: 'Enabled with mode=block', value };
      if (v === '1') return { status: 'warn', score: 3, detail: 'Enabled without mode=block', value };
      return { status: 'warn', score: 2, detail: `Unexpected: ${value}`, value };
    }
  },
  {
    name: 'Cross-Origin-Opener-Policy',
    key: 'cross-origin-opener-policy',
    maxScore: 5,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Window can be referenced by cross-origin pages.' };
      }
      // Strip report-to directive for matching
      const v = value.toLowerCase().split(';')[0].trim();
      if (v === 'same-origin') return { status: 'pass', score: 5, detail: 'same-origin', value };
      if (v === 'same-origin-allow-popups') return { status: 'pass', score: 4, detail: 'same-origin-allow-popups', value };
      if (v === 'unsafe-none') return { status: 'warn', score: 1, detail: 'unsafe-none (no isolation)', value };
      return { status: 'warn', score: 2, detail: `Unexpected: ${value}`, value };
    }
  },
  {
    name: 'Cross-Origin-Resource-Policy',
    key: 'cross-origin-resource-policy',
    maxScore: 5,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. Resources can be loaded by any origin.' };
      }
      const v = value.toLowerCase().trim();
      if (v === 'same-origin') return { status: 'pass', score: 5, detail: 'same-origin', value };
      if (v === 'same-site') return { status: 'pass', score: 4, detail: 'same-site', value };
      if (v === 'cross-origin') return { status: 'warn', score: 2, detail: 'cross-origin (permissive)', value };
      return { status: 'warn', score: 2, detail: `Unexpected: ${value}`, value };
    }
  },
  {
    name: 'Cross-Origin-Embedder-Policy',
    key: 'cross-origin-embedder-policy',
    maxScore: 5,
    analyze(value) {
      if (!value) {
        return { status: 'missing', score: 0, detail: 'Missing. No cross-origin isolation.' };
      }
      const v = value.toLowerCase().trim();
      if (v === 'require-corp') return { status: 'pass', score: 5, detail: 'require-corp', value };
      if (v === 'credentialless') return { status: 'pass', score: 4, detail: 'credentialless', value };
      if (v === 'unsafe-none') return { status: 'warn', score: 1, detail: 'unsafe-none', value };
      return { status: 'warn', score: 2, detail: `Unexpected: ${value}`, value };
    }
  },
  {
    name: 'Cache-Control',
    key: 'cache-control',
    maxScore: 5,
    analyze(value) {
      if (!value) {
        return { status: 'warn', score: 2, detail: 'Not set. Browser may cache sensitive responses.' };
      }
      const lower = value.toLowerCase();
      const hasNoStore = lower.includes('no-store');
      const hasNoCache = lower.includes('no-cache');
      const hasPrivate = lower.includes('private');

      if (hasNoStore) return { status: 'pass', score: 5, detail: 'no-store (sensitive data safe)', value };
      if (hasPrivate && hasNoCache) return { status: 'pass', score: 4, detail: 'private, no-cache', value };
      if (hasPrivate) return { status: 'warn', score: 3, detail: 'private (but may cache)', value };
      return { status: 'warn', score: 2, detail: value, value };
    }
  },
  {
    name: 'Server / X-Powered-By',
    key: '_info_leak',
    maxScore: 5,
    analyze(value, headers) {
      const server = headers['server'];
      const poweredBy = headers['x-powered-by'];
      const issues = [];
      let score = 5;

      if (server) {
        // Check if server header reveals version info
        if (/\d/.test(server)) {
          score -= 3;
          issues.push(`Server: ${server} (version exposed)`);
        } else {
          score -= 1;
          issues.push(`Server: ${server}`);
        }
      }

      if (poweredBy) {
        score -= 2;
        issues.push(`X-Powered-By: ${poweredBy} (remove this)`);
      }

      if (issues.length === 0) {
        return { status: 'pass', score: 5, detail: 'No server info leakage' };
      }

      return {
        status: score <= 1 ? 'fail' : 'warn',
        score: Math.max(score, 0),
        detail: issues.join('; ')
      };
    }
  }
];

/**
 * Analyze headers from a fetch result.
 * Returns { results, totalScore, maxScore, grade, gradeColor }
 */
export function analyzeHeaders(headers) {
  const results = [];
  let totalScore = 0;
  let maxScore = 0;

  for (const rule of RULES) {
    maxScore += rule.maxScore;
    let value;

    if (rule.key === '_info_leak') {
      value = null; // special case
    } else {
      value = headers[rule.key] || null;
    }

    const result = rule.key === '_info_leak'
      ? rule.analyze(value, headers)
      : rule.analyze(value);

    results.push({
      name: rule.name,
      maxScore: rule.maxScore,
      ...result
    });

    totalScore += result.score;
  }

  const pct = (totalScore / maxScore) * 100;
  const { grade, gradeColor } = getGrade(pct);

  return { results, totalScore, maxScore, percentage: pct, grade, gradeColor };
}

function getGrade(pct) {
  if (pct >= 95) return { grade: 'A+', gradeColor: 'greenBright' };
  if (pct >= 85) return { grade: 'A', gradeColor: 'green' };
  if (pct >= 70) return { grade: 'B', gradeColor: 'yellow' };
  if (pct >= 50) return { grade: 'C', gradeColor: 'rgb(255,165,0)' };
  if (pct >= 30) return { grade: 'D', gradeColor: 'red' };
  return { grade: 'F', gradeColor: 'redBright' };
}

export { RULES };
