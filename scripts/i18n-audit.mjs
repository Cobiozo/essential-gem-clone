#!/usr/bin/env node
/**
 * i18n audit — wykrywa hardkodowane polskie teksty w komponentach React/TS.
 * Uruchom:  node scripts/i18n-audit.mjs
 * Wynik:    i18n-audit-report.md
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const POLISH_RE = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const JSX_TEXT_RE = />\s*([^<>{}\n]{3,}?)\s*</g;
const ATTR_RE = /(?:placeholder|title|aria-label|alt)=["']([^"'<>]{3,})["']/g;
const TOAST_RE = /toast(?:\.\w+)?\(\s*["'`]([^"'`]{3,})["'`]/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, files);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(p);
  }
  return files;
}

const results = [];
for (const file of walk(ROOT)) {
  const src = fs.readFileSync(file, 'utf8');
  const usesT = /useLanguage|\bt\(['"]/.test(src);
  const hits = [];
  let m;
  while ((m = JSX_TEXT_RE.exec(src))) {
    if (POLISH_RE.test(m[1])) hits.push({ kind: 'jsx', text: m[1].trim() });
  }
  while ((m = ATTR_RE.exec(src))) {
    if (POLISH_RE.test(m[1])) hits.push({ kind: 'attr', text: m[1].trim() });
  }
  while ((m = TOAST_RE.exec(src))) {
    if (POLISH_RE.test(m[1])) hits.push({ kind: 'toast', text: m[1].trim() });
  }
  if (hits.length) results.push({ file: path.relative(process.cwd(), file), usesT, hits });
}

results.sort((a, b) => b.hits.length - a.hits.length);

const total = results.reduce((s, r) => s + r.hits.length, 0);
let md = `# i18n audit report\n\n`;
md += `**Plików z hardkodowanym PL:** ${results.length}\n`;
md += `**Łącznie wystąpień:** ${total}\n\n`;
md += `| # | Plik | usesT | Hits |\n|---|------|-------|------|\n`;
results.slice(0, 100).forEach((r, i) => {
  md += `| ${i + 1} | \`${r.file}\` | ${r.usesT ? '✅' : '❌'} | ${r.hits.length} |\n`;
});
md += `\n## Top 30 plików — szczegóły\n\n`;
for (const r of results.slice(0, 30)) {
  md += `### \`${r.file}\` (${r.hits.length})\n\n`;
  for (const h of r.hits.slice(0, 15)) {
    md += `- [${h.kind}] ${h.text.slice(0, 120)}\n`;
  }
  md += `\n`;
}

fs.writeFileSync('i18n-audit-report.md', md);
console.log(`✔ Raport zapisany: i18n-audit-report.md`);
console.log(`  Plików: ${results.length}, hits: ${total}`);
