import { URL } from 'node:url';
import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';

/**
 * Fetch headers from a URL, optionally following redirects and capturing each hop.
 */
export async function fetchHeaders(urlString, options = {}) {
  const { followRedirects = false, timeout = 10000, maxRedirects = 10 } = options;
  const hops = [];
  let currentUrl = urlString;
  let redirectCount = 0;

  while (true) {
    const hop = await fetchSingleHop(currentUrl, timeout);
    hops.push(hop);

    if (!followRedirects) break;
    if (hop.statusCode < 300 || hop.statusCode >= 400) break;
    if (redirectCount >= maxRedirects) {
      hop.warnings = hop.warnings || [];
      hop.warnings.push(`Max redirects (${maxRedirects}) reached`);
      break;
    }

    const location = hop.headers['location'];
    if (!location) break;

    currentUrl = new URL(location, currentUrl).href;
    redirectCount++;
  }

  return { hops, finalHop: hops[hops.length - 1] };
}

/**
 * Fetch a single URL and return headers + metadata.
 */
function fetchSingleHop(urlString, timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(url, {
      method: 'HEAD',
      timeout,
      rejectUnauthorized: true,
      headers: {
        'User-Agent': 'headerguard/1.0 (security-audit)',
        'Accept': '*/*'
      }
    }, (res) => {
      const result = {
        url: urlString,
        statusCode: res.statusCode,
        headers: {},
        tls: null,
        warnings: []
      };

      // Normalize header keys to lowercase
      for (const [key, value] of Object.entries(res.headers)) {
        result.headers[key.toLowerCase()] = value;
      }

      // Extract TLS info
      if (isHttps && res.socket) {
        try {
          const cipher = res.socket.getCipher?.();
          const protocol = res.socket.getProtocol?.();
          const cert = res.socket.getPeerCertificate?.(false);
          result.tls = {
            protocol: protocol || 'unknown',
            cipher: cipher?.name || 'unknown',
            cipherVersion: cipher?.version || 'unknown',
            certSubject: cert?.subject?.CN || 'unknown',
            certIssuer: cert?.issuer?.O || 'unknown',
            certExpiry: cert?.valid_to || 'unknown'
          };
        } catch {
          result.tls = { protocol: 'unknown', error: 'Could not extract TLS info' };
        }
      }

      res.resume();
      resolve(result);
    });

    req.on('error', (err) => {
      // Retry with GET if HEAD fails (some servers block HEAD)
      if (err.code !== 'ECONNREFUSED') {
        const getReq = client.request(url, {
          method: 'GET',
          timeout,
          rejectUnauthorized: true,
          headers: {
            'User-Agent': 'headerguard/1.0 (security-audit)',
            'Accept': '*/*'
          }
        }, (res) => {
          const result = {
            url: urlString,
            statusCode: res.statusCode,
            headers: {},
            tls: null,
            warnings: ['HEAD request failed, fell back to GET']
          };

          for (const [key, value] of Object.entries(res.headers)) {
            result.headers[key.toLowerCase()] = value;
          }

          if (isHttps && res.socket) {
            try {
              const cipher = res.socket.getCipher?.();
              const protocol = res.socket.getProtocol?.();
              result.tls = {
                protocol: protocol || 'unknown',
                cipher: cipher?.name || 'unknown'
              };
            } catch { /* ignore */ }
          }

          res.resume();
          resolve(result);
        });

        getReq.on('error', (getErr) => {
          reject(new Error(`Failed to connect to ${urlString}: ${getErr.message}`));
        });

        getReq.on('timeout', () => {
          getReq.destroy();
          reject(new Error(`Request to ${urlString} timed out after ${timeout}ms`));
        });

        getReq.end();
        return;
      }

      reject(new Error(`Failed to connect to ${urlString}: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${urlString} timed out after ${timeout}ms`));
    });

    req.end();
  });
}
