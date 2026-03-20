#!/usr/bin/env node

/**
 * usage.mjs — Skill usage analytics
 *
 * Subcommands:
 *   report                 — Aggregate usage by skill (--days, default 30)
 *   deprecation-candidates — Find zero-usage + stale skills (--months, default 3)
 *   rotate                 — Split usage.jsonl by month, keep recent (--keep, default 3)
 *   sync                   — Write aggregated counts back to skill-catalog.json
 *
 * Options:
 *   --catalog <path>  — Path to skill-catalog.json
 *   --days <n>        — Report period in days (default 30)
 *   --months <n>      — Staleness threshold in months (default 3)
 *   --keep <n>        — Months to keep after rotate (default 3)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, renameSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';

// ── CLI args ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const subcommand = args[0] || 'report';

function getArg(name, defaultValue) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

const LOG_DIR = process.env.CLAUDE_PLUGIN_DATA || join(homedir(), '.claude', 'plugin-data', 'skill-framework');
const LOG_FILE = join(LOG_DIR, 'usage.jsonl');
const defaultCatalog = resolve('skill-framework/data/skill-catalog.json');
const catalogPath = resolve(getArg('catalog', defaultCatalog));

// ── JSONL helpers ───────────────────────────────────────────────────

function parseJSONL(filePath) {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const records = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      console.warn(`Warning: Skipping malformed JSONL line: ${line.slice(0, 80)}`);
    }
  }
  return records;
}

function loadCatalog() {
  if (!existsSync(catalogPath)) {
    console.error(`Error: Catalog not found at ${catalogPath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(catalogPath, 'utf-8'));
}

// ── Subcommands ─────────────────────────────────────────────────────

function report() {
  const days = parseInt(getArg('days', '30'), 10);
  const cutoff = new Date(Date.now() - days * 86400000);
  const records = parseJSONL(LOG_FILE).filter(r => new Date(r.ts) >= cutoff);

  const counts = new Map();
  const lastUsed = new Map();

  for (const r of records) {
    counts.set(r.skill, (counts.get(r.skill) || 0) + 1);
    const prev = lastUsed.get(r.skill);
    if (!prev || r.ts > prev) lastUsed.set(r.skill, r.ts);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\nSkill Usage Report (last ${days} days, ${records.length} events)\n`);
  console.log('| # | Skill | Count | Last Used |');
  console.log('|---|-------|-------|-----------|');
  sorted.forEach(([skill, count], i) => {
    const last = (lastUsed.get(skill) || '').slice(0, 10);
    console.log(`| ${i + 1} | ${skill} | ${count} | ${last} |`);
  });

  if (sorted.length === 0) {
    console.log('| - | (no usage data) | - | - |');
  }
  console.log('');
}

function deprecationCandidates() {
  const months = parseInt(getArg('months', '3'), 10);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const records = parseJSONL(LOG_FILE);
  const usedSkills = new Set(records.map(r => r.skill));

  const catalog = loadCatalog();
  const candidates = (catalog.skills || []).filter(s => {
    if (s.deleted) return false;
    if (s.scope === 'plugin') return false;
    const hasUsage = usedSkills.has(s.id);
    const isStale = s.updatedAt && new Date(s.updatedAt) < cutoff;
    return !hasUsage && isStale;
  });

  console.log(`\nDeprecation Candidates (0 usage + stale > ${months} months)\n`);
  console.log('| # | Skill | Scope | Last Updated |');
  console.log('|---|-------|-------|--------------|');
  candidates.forEach((s, i) => {
    const updated = (s.updatedAt || '').slice(0, 10);
    console.log(`| ${i + 1} | ${s.id} | ${s.scope} | ${updated} |`);
  });

  if (candidates.length === 0) {
    console.log('| - | (no candidates) | - | - |');
  }
  console.log(`\nTotal: ${candidates.length} candidates\n`);
}

function rotate() {
  const keep = parseInt(getArg('keep', '3'), 10);
  const records = parseJSONL(LOG_FILE);

  if (records.length === 0) {
    console.log('No records to rotate.');
    return;
  }

  // Group by YYYY-MM
  const byMonth = new Map();
  for (const r of records) {
    const month = (r.ts || '').slice(0, 7); // YYYY-MM
    if (!month) continue;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(r);
  }

  const sortedMonths = [...byMonth.keys()].sort();
  const keepFrom = sortedMonths.length > keep ? sortedMonths.slice(-keep) : sortedMonths;

  // Write each month's file
  for (const month of sortedMonths) {
    const monthFile = join(LOG_DIR, `usage-${month}.jsonl`);
    const lines = byMonth.get(month).map(r => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(monthFile, lines, 'utf-8');
    console.log(`  📁 ${basename(monthFile)}: ${byMonth.get(month).length} records`);
  }

  // Remove old months
  const toRemove = sortedMonths.filter(m => !keepFrom.includes(m));
  for (const month of toRemove) {
    const monthFile = join(LOG_DIR, `usage-${month}.jsonl`);
    try {
      unlinkSync(monthFile);
      console.log(`  🗑️  Removed: ${basename(monthFile)}`);
    } catch {
      // ignore
    }
  }

  // Rewrite main file with only kept months
  const keptRecords = [];
  for (const month of keepFrom) {
    keptRecords.push(...(byMonth.get(month) || []));
  }
  writeFileSync(LOG_FILE, keptRecords.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf-8');

  console.log(`\nRotated: ${sortedMonths.length} months → kept ${keepFrom.length}, removed ${toRemove.length}`);
}

function sync() {
  const records = parseJSONL(LOG_FILE);
  const catalog = loadCatalog();

  // Aggregate all-time counts
  const counts = new Map();
  const lastUsed = new Map();

  for (const r of records) {
    counts.set(r.skill, (counts.get(r.skill) || 0) + 1);
    const prev = lastUsed.get(r.skill);
    if (!prev || r.ts > prev) lastUsed.set(r.skill, r.ts);
  }

  let updated = 0;
  for (const skill of (catalog.skills || [])) {
    const count = counts.get(skill.id);
    const last = lastUsed.get(skill.id);
    if (count !== undefined) {
      skill.usageCount = count;
      skill.lastUsedAt = last || skill.lastUsedAt;
      updated++;
    }
  }

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf-8');
  console.log(`\nSynced usage → catalog: ${updated} skills updated (${records.length} total events)`);
}

// ── Main ────────────────────────────────────────────────────────────

const commands = { report, 'deprecation-candidates': deprecationCandidates, rotate, sync };

if (!commands[subcommand]) {
  console.error(`Unknown subcommand: ${subcommand}`);
  console.error('Available: report, deprecation-candidates, rotate, sync');
  process.exit(1);
}

commands[subcommand]();
