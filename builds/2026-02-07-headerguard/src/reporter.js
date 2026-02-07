import chalk from 'chalk';
import Table from 'cli-table3';

const STATUS_ICONS = {
  pass: chalk.green('✓'),
  warn: chalk.yellow('⚠'),
  fail: chalk.red('✗'),
  missing: chalk.red('✗')
};

const STATUS_COLORS = {
  pass: chalk.green,
  warn: chalk.yellow,
  fail: chalk.red,
  missing: chalk.red
};

const GRADE_COLORS = {
  'A+': chalk.greenBright,
  'A': chalk.green,
  'B': chalk.yellow,
  'C': chalk.hex('#FFA500'),
  'D': chalk.red,
  'F': chalk.redBright
};

/**
 * Print a full analysis report to the terminal.
 */
export function printReport(analysis, url, options = {}) {
  const { tls, showValue = false } = options;

  console.log();
  console.log(chalk.bold(`  headerguard`), chalk.dim(`— ${url}`));
  console.log();

  // Grade banner
  const gradeColor = GRADE_COLORS[analysis.grade] || chalk.white;
  const gradeBar = getGradeBar(analysis.percentage);

  console.log(`  ${gradeColor.bold(`  ${analysis.grade}  `)}  ${chalk.bold(`${analysis.totalScore}`)}${chalk.dim(`/${analysis.maxScore}`)} ${chalk.dim('points')}  ${gradeBar}`);
  console.log();

  // Header table
  const table = new Table({
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '  ', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': ' '
    },
    style: { 'padding-left': 0, 'padding-right': 1 },
    colWidths: [4, 34, 8, null]
  });

  for (const result of analysis.results) {
    const icon = STATUS_ICONS[result.status] || '?';
    const colorFn = STATUS_COLORS[result.status] || chalk.white;
    const scoreStr = `${result.score}/${result.maxScore}`;

    table.push([
      icon,
      chalk.bold(result.name),
      colorFn(scoreStr),
      chalk.dim(truncate(result.detail, 60))
    ]);
  }

  console.log(table.toString());
  console.log();

  // TLS info
  if (tls) {
    console.log(chalk.dim(`  TLS: ${tls.protocol || 'N/A'} | Cipher: ${tls.cipher || 'N/A'} | Issuer: ${tls.certIssuer || 'N/A'}`));
    console.log();
  }
}

/**
 * Print comparison of two URLs side by side.
 */
export function printComparison(analysis1, analysis2, url1, url2) {
  console.log();
  console.log(chalk.bold(`  headerguard compare`));
  console.log();

  const grade1Color = GRADE_COLORS[analysis1.grade] || chalk.white;
  const grade2Color = GRADE_COLORS[analysis2.grade] || chalk.white;

  console.log(`  ${chalk.dim(url1)}`);
  console.log(`  ${grade1Color.bold(analysis1.grade)} ${chalk.bold(analysis1.totalScore)}/${analysis1.maxScore}`);
  console.log();
  console.log(`  ${chalk.dim(url2)}`);
  console.log(`  ${grade2Color.bold(analysis2.grade)} ${chalk.bold(analysis2.totalScore)}/${analysis2.maxScore}`);
  console.log();

  const table = new Table({
    chars: {
      'top': '', 'top-mid': '', 'top-left': '', 'top-right': '',
      'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
      'left': '  ', 'left-mid': '', 'mid': '─', 'mid-mid': '',
      'right': '', 'right-mid': '', 'middle': ' │ '
    },
    style: { 'padding-left': 0, 'padding-right': 1 },
    head: ['', chalk.bold('Header'), chalk.bold('URL 1'), chalk.bold('URL 2')]
  });

  for (let i = 0; i < analysis1.results.length; i++) {
    const r1 = analysis1.results[i];
    const r2 = analysis2.results[i];
    const icon1 = STATUS_ICONS[r1.status];
    const icon2 = STATUS_ICONS[r2.status];
    const color1 = STATUS_COLORS[r1.status];
    const color2 = STATUS_COLORS[r2.status];

    // Highlight differences
    const diff = r1.score !== r2.score;
    const name = diff ? chalk.bold.underline(r1.name) : chalk.bold(r1.name);

    table.push([
      '',
      name,
      `${icon1} ${color1(`${r1.score}/${r1.maxScore}`)}`,
      `${icon2} ${color2(`${r2.score}/${r2.maxScore}`)}`
    ]);
  }

  console.log(table.toString());
  console.log();
}

/**
 * Print fix suggestions.
 */
export function printFixes(fixes, server) {
  if (fixes.length === 0) {
    console.log(chalk.green('\n  All headers configured correctly. No fixes needed.\n'));
    return;
  }

  console.log();
  console.log(chalk.bold(`  Fix suggestions for ${server}`));
  console.log(chalk.dim(`  ${'─'.repeat(50)}`));

  for (const fix of fixes) {
    const icon = STATUS_ICONS[fix.status];
    console.log();
    console.log(`  ${icon} ${chalk.bold(fix.header)}`);
    console.log(chalk.dim(`     ${fix.detail}`));
    console.log();
    // Indent config lines
    const lines = fix.config.split('\n');
    for (const line of lines) {
      console.log(chalk.cyan(`     ${line}`));
    }
  }

  console.log();
}

/**
 * Print hop-by-hop redirect analysis.
 */
export function printHops(hops) {
  if (hops.length <= 1) return;

  console.log();
  console.log(chalk.bold(`  Redirect chain (${hops.length} hops)`));
  console.log();

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];
    const isLast = i === hops.length - 1;
    const prefix = isLast ? '  └─' : '  ├─';
    const statusColor = hop.statusCode >= 200 && hop.statusCode < 300 ? chalk.green : chalk.yellow;

    console.log(`${prefix} ${statusColor(hop.statusCode)} ${chalk.dim(hop.url)}`);
    if (hop.warnings?.length) {
      for (const w of hop.warnings) {
        console.log(`  │  ${chalk.yellow('⚠')} ${chalk.dim(w)}`);
      }
    }
  }
  console.log();
}

/**
 * Output as JSON.
 */
export function toJSON(analysis, url, options = {}) {
  return {
    url,
    timestamp: new Date().toISOString(),
    grade: analysis.grade,
    score: analysis.totalScore,
    maxScore: analysis.maxScore,
    percentage: Math.round(analysis.percentage * 10) / 10,
    headers: analysis.results.map(r => ({
      name: r.name,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore,
      detail: r.detail,
      value: r.value || null
    })),
    ...(options.tls ? { tls: options.tls } : {})
  };
}

/**
 * Output as markdown.
 */
export function toMarkdown(analysis, url) {
  let md = `# Security Header Audit: ${url}\n\n`;
  md += `**Grade:** ${analysis.grade} (${analysis.totalScore}/${analysis.maxScore})\n`;
  md += `**Date:** ${new Date().toISOString()}\n\n`;
  md += `| Status | Header | Score | Detail |\n`;
  md += `|--------|--------|-------|--------|\n`;

  for (const r of analysis.results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌';
    md += `| ${icon} | ${r.name} | ${r.score}/${r.maxScore} | ${r.detail} |\n`;
  }

  return md;
}

// Helpers

function getGradeBar(pct) {
  const width = 20;
  const filled = Math.round(pct / 100 * width);
  const empty = width - filled;

  let barColor;
  if (pct >= 85) barColor = chalk.green;
  else if (pct >= 70) barColor = chalk.yellow;
  else if (pct >= 50) barColor = chalk.hex('#FFA500');
  else barColor = chalk.red;

  return barColor('█'.repeat(filled)) + chalk.dim('░'.repeat(empty)) + chalk.dim(` ${Math.round(pct)}%`);
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max - 1) + '…' : str;
}
