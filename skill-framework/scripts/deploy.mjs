#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');

function loadConfig(configPath) {
  const abs = resolve(ROOT, configPath);
  if (!existsSync(abs)) {
    console.error(`❌ Config not found: ${abs}`);
    console.error(`   Create it with: cp skill-framework/data/deploy-config.example.json ${configPath}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function loadCatalog(catalogPath) {
  const abs = resolve(ROOT, catalogPath);
  if (!existsSync(abs)) {
    console.error(`❌ Catalog not found: ${abs}`);
    console.error(`   Run: node skill-framework/scripts/scan.mjs`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(abs, 'utf-8'));
}

function matchGlob(name, pattern) {
  if (pattern === '*') return true;
  // simple glob: "ax-*" → starts with "ax-", "*-end" → ends with "-end"
  if (pattern.startsWith('*') && pattern.endsWith('*')) {
    return name.includes(pattern.slice(1, -1));
  }
  if (pattern.endsWith('*')) {
    return name.startsWith(pattern.slice(0, -1));
  }
  if (pattern.startsWith('*')) {
    return name.endsWith(pattern.slice(1));
  }
  return name === pattern;
}

function filterSkills(catalog, pattern, config) {
  const includePatterns = config.include ?? ['*'];
  const excludePatterns = config.exclude ?? [];

  return catalog.skills.filter((skill) => {
    // skip deleted
    if (skill.deleted) return false;
    // scope filter: user + project only
    if (skill.scope !== 'user' && skill.scope !== 'project') return false;
    // --skills pattern
    if (!matchGlob(skill.name, pattern)) return false;
    // include filter
    const included = includePatterns.some((p) => matchGlob(skill.name, p));
    if (!included) return false;
    // exclude filter
    const excluded = excludePatterns.some((p) => matchGlob(skill.name, p));
    if (excluded) return false;
    return true;
  });
}

function packageSkills(skills, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const results = { deployed: [], skipped: [] };

  for (const skill of skills) {
    try {
      const srcPath = resolve(ROOT, skill.path);
      if (!existsSync(srcPath)) {
        results.skipped.push({ name: skill.name, reason: 'path not found' });
        continue;
      }

      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        // skill type: copy entire directory
        const dest = join(targetDir, skill.name);
        cpSync(srcPath, dest, { recursive: true });
      } else {
        // command type: copy single .md file
        const dest = join(targetDir, basename(srcPath));
        cpSync(srcPath, dest);
      }
      results.deployed.push(skill.name);
    } catch (err) {
      results.skipped.push({ name: skill.name, reason: err.message });
    }
  }
  return results;
}

function deployTeam(config, skills, dryRun) {
  const teamCfg = config.team;
  if (!teamCfg?.repoUrl) {
    console.error('❌ team.repoUrl is required in deploy-config.json');
    process.exit(1);
  }

  const tmpDir = join(ROOT, '.team-tmp', 'deploy-' + Date.now());
  mkdirSync(tmpDir, { recursive: true });

  try {
    console.log(`   Cloning ${teamCfg.repoUrl}...`);
    execSync(`git clone --depth 1 --branch ${teamCfg.branch ?? 'main'} ${teamCfg.repoUrl} ${tmpDir}`, { stdio: 'pipe' });

    const skillsDir = join(tmpDir, teamCfg.targetDir ?? 'skills/');
    const results = packageSkills(skills, skillsDir);

    if (results.deployed.length === 0) {
      console.log('   No skills to deploy.');
      return results;
    }

    execSync('git add -A', { cwd: tmpDir, stdio: 'pipe' });
    const commitMsg = `${teamCfg.commitPrefix ?? 'chore(skills):'} deploy ${results.deployed.length} skills`;
    execSync(`git commit -m "${commitMsg}" --allow-empty`, { cwd: tmpDir, stdio: 'pipe' });

    if (dryRun) {
      console.log('   ⏭️  Dry run — skipping push');
    } else {
      execSync('git push', { cwd: tmpDir, stdio: 'pipe' });
    }

    return results;
  } finally {
    // cleanup tmpDir
    try { execSync(`rm -rf ${tmpDir}`, { stdio: 'pipe' }); } catch { /* ignore */ }
  }
}

function deployLocal(config, skills) {
  const localCfg = config.local;
  const targetDir = resolve(localCfg.targetDir.replace('~', process.env.HOME ?? '~'));
  const results = packageSkills(skills, targetDir);
  return results;
}

function main() {
  const { values } = parseArgs({
    options: {
      target: { type: 'string', default: 'local' },
      skills: { type: 'string', default: '*' },
      'dry-run': { type: 'boolean', default: false },
      config: { type: 'string', default: 'skill-framework/data/deploy-config.json' },
      catalog: { type: 'string', default: 'skill-framework/data/skill-catalog.json' },
    },
  });

  const target = values.target;
  const dryRun = values['dry-run'];

  const config = loadConfig(values.config);
  const catalog = loadCatalog(values.catalog);
  const skills = filterSkills(catalog, values.skills, config);

  const targetLabel = target === 'team'
    ? `${config.team?.repoUrl} (${config.team?.branch ?? 'main'})`
    : resolve((config.local?.targetDir ?? '~/.claude/skills/').replace('~', process.env.HOME ?? '~'));

  console.log(`📦 Skill Deploy — target: ${target}`);
  console.log(`   Skills: ${skills.length} selected (pattern: ${values.skills})`);
  console.log(`   Deploying to: ${targetLabel}`);

  let results;
  if (target === 'team') {
    results = deployTeam(config, skills, dryRun);
  } else {
    results = deployLocal(config, skills);
  }

  for (const name of results.deployed) {
    console.log(`   ✅ ${name}`);
  }
  for (const { name, reason } of results.skipped) {
    console.log(`   ⏭️  ${name} — ${reason}`);
  }
  console.log(`   Result: ${results.deployed.length} deployed, ${results.skipped.length} skipped`);
}

main();
