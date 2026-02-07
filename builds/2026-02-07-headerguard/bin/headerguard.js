#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { fetchHeaders } from '../src/fetcher.js';
import { analyzeHeaders } from '../src/analyzer.js';
import { getFixes, getSupportedServers } from '../src/fixes.js';
import {
  printReport, printComparison, printFixes,
  printHops, toJSON, toMarkdown
} from '../src/reporter.js';

program
  .name('headerguard')
  .description('Grade your site\'s HTTP security headers in one command')
  .version('1.0.0')
  .argument('<url>', 'URL to audit')
  .option('--follow', 'Audit each redirect hop')
  .option('--fix <server>', `Show fix snippets (${getSupportedServers().join(', ')})`)
  .option('--compare <url2>', 'Compare with another URL')
  .option('--json', 'Output as JSON')
  .option('--markdown', 'Output as markdown')
  .option('--ci <grade>', 'Exit 1 if grade is below threshold (A+, A, B, C, D)')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
  .action(async (url, opts) => {
    try {
      // Normalize URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // Fetch
      const { hops, finalHop } = await fetchHeaders(url, {
        followRedirects: opts.follow || false,
        timeout: parseInt(opts.timeout)
      });

      // Analyze final hop
      const analysis = analyzeHeaders(finalHop.headers);

      // Compare mode
      if (opts.compare) {
        let url2 = opts.compare;
        if (!url2.startsWith('http://') && !url2.startsWith('https://')) {
          url2 = 'https://' + url2;
        }
        const { finalHop: hop2 } = await fetchHeaders(url2, {
          followRedirects: opts.follow || false,
          timeout: parseInt(opts.timeout)
        });
        const analysis2 = analyzeHeaders(hop2.headers);

        if (opts.json) {
          const output = {
            url1: toJSON(analysis, url, { tls: finalHop.tls }),
            url2: toJSON(analysis2, url2, { tls: hop2.tls })
          };
          console.log(JSON.stringify(output, null, 2));
        } else {
          printComparison(analysis, analysis2, url, url2);
        }

        return handleCiGate(opts.ci, analysis);
      }

      // JSON output
      if (opts.json) {
        const output = toJSON(analysis, url, { tls: finalHop.tls });
        console.log(JSON.stringify(output, null, 2));
        return handleCiGate(opts.ci, analysis);
      }

      // Markdown output
      if (opts.markdown) {
        console.log(toMarkdown(analysis, url));
        return handleCiGate(opts.ci, analysis);
      }

      // Standard report
      if (opts.follow && hops.length > 1) {
        printHops(hops);
      }

      printReport(analysis, url, { tls: finalHop.tls });

      // Fix suggestions
      if (opts.fix) {
        const server = opts.fix.toLowerCase();
        if (!getSupportedServers().includes(server)) {
          console.error(chalk.red(`  Unknown server: ${server}. Supported: ${getSupportedServers().join(', ')}`));
          process.exit(1);
        }
        const fixes = getFixes(analysis.results, server);
        printFixes(fixes, server);
      }

      handleCiGate(opts.ci, analysis);

    } catch (err) {
      console.error(chalk.red(`\n  Error: ${err.message}\n`));
      process.exit(1);
    }
  });

function handleCiGate(ciGrade, analysis) {
  if (!ciGrade) return;

  const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'A+'];
  const analysisIdx = gradeOrder.indexOf(analysis.grade);
  const thresholdIdx = gradeOrder.indexOf(ciGrade.toUpperCase());

  if (thresholdIdx === -1) {
    console.error(chalk.red(`  Invalid grade threshold: ${ciGrade}`));
    process.exit(1);
  }

  if (analysisIdx < thresholdIdx) {
    console.error(chalk.red(`\n  CI gate failed: grade ${analysis.grade} is below threshold ${ciGrade.toUpperCase()}\n`));
    process.exit(1);
  }
}

program.parse();
