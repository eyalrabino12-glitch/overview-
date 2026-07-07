#!/usr/bin/env node
/**
 * vola-code-check — Pass 0 automated triage
 *
 * Usage: node check-file.mjs <file.html|file.js>
 *
 * 1. Syntax-checks the JS (every inline <script> block of an HTML file, or the
 *    whole file if it's .js/.mjs) via `node --check`, mapping errors back to the
 *    original line numbers.
 * 2. Prints LEADS (not findings): dangerous sinks, unguarded-looking storage and
 *    JSON.parse call sites, fetch calls, TODO/FIXME, console.log leftovers.
 *
 * Zero dependencies. Exit code 1 = syntax error (stop and fix before reviewing).
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node check-file.mjs <file.html|file.js>');
  process.exit(2);
}

let source;
try {
  source = readFileSync(file, 'utf8');
} catch (e) {
  console.error(`Cannot read ${file}: ${e.message}`);
  process.exit(2);
}

const lines = source.split('\n');
const isHtml = ['.html', '.htm'].includes(extname(file).toLowerCase());

// ---------- collect script blocks ----------
/** @type {{code: string, startLine: number, module: boolean}[]} */
const blocks = [];
if (isHtml) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(source)) !== null) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue; // external script, nothing inline to check
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '';
    if (type && !/javascript|module|^$/i.test(type)) continue; // JSON templates etc.
    const before = source.slice(0, m.index + m[0].indexOf('>') + 1);
    const startLine = before.split('\n').length;
    blocks.push({ code: m[2], startLine, module: /module/i.test(type) });
  }
} else {
  blocks.push({ code: source, startLine: 1, module: file.endsWith('.mjs') });
}

// ---------- 1. syntax gate ----------
let syntaxOk = true;
if (blocks.length === 0) {
  console.log('SYNTAX: no inline JS found (nothing to check).');
} else {
  const dir = mkdtempSync(join(tmpdir(), 'vola-check-'));
  blocks.forEach((b, i) => {
    const tmp = join(dir, `block-${i}${b.module ? '.mjs' : '.js'}`);
    writeFileSync(tmp, b.code, 'utf8');
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      syntaxOk = false;
      // remap "block-0.js:12" to the real line in the source file
      const msg = String(e.stderr || e.message).replace(
        new RegExp(tmp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':(\\d+)', 'g'),
        (_, n) => `${file}:${Number(n) + b.startLine - 1}`
      );
      console.log(`SYNTAX ERROR in <script> block #${i + 1} (starts at line ${b.startLine}):`);
      console.log(msg.split('\n').slice(0, 12).join('\n'));
    }
  });
  rmSync(dir, { recursive: true, force: true });
  if (syntaxOk) console.log(`SYNTAX: OK — ${blocks.length} script block(s) parse cleanly.`);
}

// ---------- 2. leads ----------
const leads = {
  'XSS sinks — does user/API data reach these? (Pass 5)': /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write\s*\(|\beval\s*\(|new\s+Function\s*\(/,
  'Storage writes — each inside try/catch? (Pass 4)': /localStorage\s*\.\s*setItem|sessionStorage\s*\.\s*setItem/,
  'JSON.parse — each guarded? (Pass 4)': /JSON\s*\.\s*parse\s*\(/,
  'fetch calls — res.ok checked? .catch? timeout? (Pass 3)': /\bfetch\s*\(/,
  'Numeric sort — comparator present? (Pass 2)': /\.sort\s*\(\s*\)/,
  'parseFloat/parseInt on user input — separators handled? (Pass 2)': /parse(Float|Int)\s*\(/,
  'Empty catch — errors swallowed silently? (Pass 4)': /catch\s*(\([^)]*\))?\s*\{\s*\}/,
  'TODO/FIXME left in': /\/\/\s*(TODO|FIXME)|\/\*\s*(TODO|FIXME)/i,
  'console.log leftovers': /console\.log\s*\(/,
};

console.log('\nLEADS (verify each — these are pointers, not findings):');
let any = false;
for (const [label, re] of Object.entries(leads)) {
  const hits = [];
  lines.forEach((l, i) => { if (re.test(l)) hits.push(i + 1); });
  if (hits.length) {
    any = true;
    const shown = hits.slice(0, 15).join(', ') + (hits.length > 15 ? ` … (+${hits.length - 15} more)` : '');
    console.log(`- ${label}: ${hits.length} hit(s) at line(s) ${shown}`);
  }
}
if (!any) console.log('- none of the standard smell patterns matched.');

console.log(`\nFile: ${lines.length} lines. Review in chunks of ≤400 lines (map first if bigger).`);
process.exit(syntaxOk ? 0 : 1);
