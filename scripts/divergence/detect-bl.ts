/**
 * F426 (Sprint 259) → F427 (Sprint 260) — BL-level DIVERGENCE 자동 검출 CLI.
 *
 * Sprint 260 확장:
 *   - --rules <path> 추가 (rules.md 입력)
 *   - 5 detector 일괄 실행 (BL-024/026/027/028/029) via BL_DETECTOR_REGISTRY
 *   - rules.md → BLRule[] → registry lookup → markers 일괄 산출
 *
 * Usage:
 *   tsx scripts/divergence/detect-bl.ts \
 *     --source <path-to-ts> \
 *     --rules <path-to-md> \
 *     [--provenance <path-to-yaml>] \
 *     [--out <output-json>] \
 *     [--target-functions <name1,name2>] \
 *     [--verbose]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  parseTypeScriptSource,
  parseRulesMarkdown,
  BL_DETECTOR_REGISTRY,
  detectUnderImplementation,
  detectHardCodedExclusion,
  detectTemporalCheck,
  detectExpiryCheck,
  detectCashbackBranch,
  crossCheck,
} from "../../packages/utils/src/divergence/index.js";
import type {
  BLDivergenceMarker,
  BLRule,
  CrossCheckRecommendation,
} from "../../packages/types/src/index.js";
import { DOMAIN_MAP, type DomainMapping } from "./domain-source-map.js";

void detectHardCodedExclusion;
void detectTemporalCheck;
void detectExpiryCheck;
void detectCashbackBranch;

interface CliArgs {
  source: string;
  rules: string;
  provenance: string;
  out: string;
  targetFunctions: string[];
  verbose: boolean;
  allDomains: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = {
    source: "",
    rules: "",
    provenance: "",
    out: "",
    targetFunctions: [],
    verbose: false,
    allDomains: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--source") out.source = args[++i] ?? "";
    else if (arg === "--rules") out.rules = args[++i] ?? "";
    else if (arg === "--provenance") out.provenance = args[++i] ?? "";
    else if (arg === "--out") out.out = args[++i] ?? "";
    else if (arg === "--target-functions") {
      out.targetFunctions = (args[++i] ?? "").split(",").filter(Boolean);
    } else if (arg === "--verbose") out.verbose = true;
    else if (arg === "--all-domains") out.allDomains = true;
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  // --all-domains는 --source 불필요
  if (!out.allDomains && !out.source) {
    process.stderr.write("Error: --source or --all-domains is required\n");
    printUsage();
    process.exit(1);
  }
  return out;
}

function printUsage(): void {
  process.stderr.write(
    `Usage:
  Single domain:
    tsx scripts/divergence/detect-bl.ts \\
      --source <path-to-ts> [--rules <path-to-md>] [--provenance <path-to-yaml>] [--out <json>] \\
      [--target-functions <name1,name2>] [--verbose]

  Multi-domain (Sprint 261 F428):
    tsx scripts/divergence/detect-bl.ts \\
      --all-domains [--out <json>] [--verbose]\n`,
  );
}

interface PerRuleResult {
  ruleId: string;
  detected: number;
  markers: BLDivergenceMarker[];
  rule?: BLRule;
}

interface DomainResult {
  container: string;
  rulesPath: string;
  sourcePath: string | null;
  sourceCodeStatus: string;
  rulesParsed: number;
  parsedBLs: string[];
  applicableDetectors: number;
  perRule: PerRuleResult[];
  crossCheck: CrossCheckRecommendation[];
  summary: {
    totalMarkers: number;
    presenceCount: number;  // detector PRESENCE (RESOLVED 자동 입증)
    absenceCount: number;   // detector ABSENCE (DIVERGENCE 발행)
    notApplicableCount: number; // BL이 detector 미커버
  };
}

function runMultiDomain(args: CliArgs): void {
  const results: DomainResult[] = [];

  for (const mapping of DOMAIN_MAP) {
    const rulesText = existsSync(mapping.rulesPath)
      ? readFileSync(mapping.rulesPath, "utf8")
      : "";
    const rules: BLRule[] = rulesText ? parseRulesMarkdown(rulesText) : [];

    const perRule: PerRuleResult[] = [];
    let applicableDetectors = 0;
    let absenceCount = 0;
    let presenceCount = 0;
    let notApplicableCount = 0;

    if (mapping.sourcePath && existsSync(mapping.sourcePath)) {
      const sf = parseTypeScriptSource(
        mapping.sourcePath,
        readFileSync(mapping.sourcePath, "utf8"),
      );
      for (const rule of rules) {
        const fn = BL_DETECTOR_REGISTRY[rule.id];
        if (fn) {
          applicableDetectors++;
          let markers: BLDivergenceMarker[];
          // BL-027 under-implementation은 도메인별 target functions 적용 필요 (mock/helper false positive 회피)
          if (rule.id === "BL-027" && mapping.underImplTargets) {
            markers = detectUnderImplementation(sf, mapping.sourcePath, {
              targetFunctionNames: mapping.underImplTargets,
            });
          } else {
            markers = fn(sf, mapping.sourcePath);
          }
          perRule.push({ ruleId: rule.id, detected: markers.length, markers, rule });
          if (markers.length === 0) presenceCount++;
          else absenceCount++;
        } else {
          notApplicableCount++;
          perRule.push({ ruleId: rule.id, detected: 0, markers: [], rule });
        }
      }
    } else {
      // spec-only domain — detector 실행 skip
      for (const rule of rules) {
        notApplicableCount++;
        perRule.push({ ruleId: rule.id, detected: 0, markers: [], rule });
      }
    }

    let recommendations: CrossCheckRecommendation[] = [];
    if (existsSync(mapping.provenancePath)) {
      const yamlText = readFileSync(mapping.provenancePath, "utf8");
      const allMarkers = perRule.flatMap((p) => p.markers);
      recommendations = crossCheck(yamlText, allMarkers);
    }

    results.push({
      container: mapping.container,
      rulesPath: mapping.rulesPath,
      sourcePath: mapping.sourcePath,
      sourceCodeStatus: mapping.sourceCodeStatus,
      rulesParsed: rules.length,
      parsedBLs: rules.map((r) => r.id),
      applicableDetectors,
      perRule,
      crossCheck: recommendations,
      summary: {
        totalMarkers: perRule.reduce((s, p) => s + p.detected, 0),
        presenceCount,
        absenceCount,
        notApplicableCount,
      },
    });
  }

  // Stdout summary
  process.stdout.write(`=== Multi-Domain BL Detector — ${DOMAIN_MAP.length} containers ===\n`);
  let totalBLs = 0;
  let totalApplicable = 0;
  for (const r of results) {
    totalBLs += r.rulesParsed;
    totalApplicable += r.applicableDetectors;
    const sourceTag = r.sourceCodeStatus === "spec-only" ? "[spec-only]" : `[source: ${r.sourcePath}]`;
    process.stdout.write(
      `  ${r.container} ${sourceTag}: ${r.rulesParsed} BLs, ${r.applicableDetectors} applicable detectors, ${r.summary.absenceCount} ABSENCE markers\n`,
    );
    if (args.verbose && r.parsedBLs.length > 0) {
      process.stdout.write(`    BL IDs: ${r.parsedBLs.join(", ")}\n`);
    }
  }
  process.stdout.write(
    `\nSummary: ${totalBLs} total BLs, ${totalApplicable} detector applications across ${DOMAIN_MAP.length} containers\n`,
  );
  process.stdout.write(
    `Detector coverage: ${totalApplicable}/${totalBLs} = ${((totalApplicable / totalBLs) * 100).toFixed(1)}%\n`,
  );

  const output = {
    detectorVersion: "2.1.0",
    measuredAt: new Date().toISOString(),
    mode: "all-domains",
    totalContainers: DOMAIN_MAP.length,
    totalBLs,
    totalApplicableDetectors: totalApplicable,
    coverage: totalBLs > 0 ? totalApplicable / totalBLs : 0,
    results,
  };

  if (args.out) {
    writeFileSync(args.out, JSON.stringify(output, null, 2), "utf8");
    process.stdout.write(`\n[detect-bl] Written: ${args.out}\n`);
  }
}

function main(): void {
  const args = parseArgs();

  if (args.allDomains) {
    runMultiDomain(args);
    return;
  }

  const sourceText = readFileSync(args.source, "utf8");
  const sf = parseTypeScriptSource(args.source, sourceText);

  // rules.md 파싱 (선택). 미제공 시 registry 전수 실행.
  let rules: BLRule[] = [];
  if (args.rules) {
    const rulesText = readFileSync(args.rules, "utf8");
    rules = parseRulesMarkdown(rulesText);
  }

  const supportedRuleIds = Object.keys(BL_DETECTOR_REGISTRY);

  // rules.md에서 추출된 규칙 중 detector 지원되는 것 + 지원되지만 rules.md에 누락된 것 모두 처리.
  const ruleIdsToRun = rules.length > 0
    ? Array.from(new Set([
        ...rules.map((r) => r.id).filter((id) => supportedRuleIds.includes(id)),
        ...supportedRuleIds,
      ])).sort()
    : supportedRuleIds.slice().sort();

  const perRule: PerRuleResult[] = [];
  const allMarkers: BLDivergenceMarker[] = [];

  for (const ruleId of ruleIdsToRun) {
    const fn = BL_DETECTOR_REGISTRY[ruleId];
    if (!fn) continue;

    let markers: BLDivergenceMarker[];
    if (ruleId === "BL-027" && args.targetFunctions.length > 0) {
      markers = detectUnderImplementation(sf, args.source, {
        targetFunctionNames: args.targetFunctions,
      });
    } else {
      markers = fn(sf, args.source);
    }

    allMarkers.push(...markers);
    const rule = rules.find((r) => r.id === ruleId);
    perRule.push({
      ruleId,
      detected: markers.length,
      markers,
      ...(rule ? { rule } : {}),
    });
  }

  let recommendations: CrossCheckRecommendation[] = [];
  let provenanceRead = false;
  if (args.provenance) {
    const yamlText = readFileSync(args.provenance, "utf8");
    recommendations = crossCheck(yamlText, allMarkers);
    provenanceRead = true;
  }

  const result = {
    source: args.source,
    rulesFile: args.rules || null,
    measuredAt: new Date().toISOString(),
    detectorVersion: "2.0.0",
    rulesParsed: rules.length,
    detectorsRun: perRule.length,
    perRule,
    summary: {
      totalMarkers: allMarkers.length,
      byRule: Object.fromEntries(perRule.map((p) => [p.ruleId, p.detected])),
    },
    provenanceCrossCheck: provenanceRead
      ? {
          provenanceFile: args.provenance,
          recommendations,
          summary: {
            total: recommendations.length,
            recommendResolved: recommendations.filter(
              (r) => r.manualStatus === "OPEN" && r.recommendedStatus === "RESOLVED",
            ).length,
            keepOpen: recommendations.filter(
              (r) => r.manualStatus === "OPEN" && r.recommendedStatus === "OPEN",
            ).length,
            unknown: recommendations.filter((r) => r.recommendedStatus === "UNKNOWN").length,
            regressionRisk: recommendations.filter(
              (r) => r.manualStatus === "RESOLVED" && r.recommendedStatus === "OPEN",
            ).length,
          },
        }
      : null,
  };

  // Stdout summary
  process.stdout.write(`=== BL Detector v2.0.0 — ${args.source} ===\n`);
  if (args.rules) {
    process.stdout.write(`  rules.md: ${args.rules} (${rules.length} BL rules parsed)\n`);
  }
  for (const r of perRule) {
    const tag = r.detected === 0 ? "PRESENT (RESOLVED auto-evidence)" : `${r.detected} ABSENCE marker(s)`;
    process.stdout.write(`  ${r.ruleId}: ${tag}\n`);
    if (args.verbose) {
      for (const m of r.markers) {
        process.stdout.write(`    L${m.sourceLine || "-"}: ${m.detail}\n`);
      }
    }
  }
  if (provenanceRead) {
    process.stdout.write(`\n  Provenance cross-check (${recommendations.length} markers):\n`);
    for (const r of recommendations) {
      const tag = r.detectorSupported ? "" : " [UNSUPPORTED]";
      const indicator =
        r.recommendedStatus === "UNKNOWN"
          ? "→ UNKNOWN (detector 미지원)"
          : r.manualStatus === r.recommendedStatus
            ? "→ consistent"
            : `→ recommend ${r.recommendedStatus}`;
      process.stdout.write(
        `    ${r.ruleId}${tag}: manual=${r.manualStatus} auto=${r.autoDetectionCount} ${indicator}\n`,
      );
    }
  }

  if (args.out) {
    writeFileSync(args.out, JSON.stringify(result, null, 2), "utf8");
    process.stdout.write(`\n[detect-bl] Written: ${args.out}\n`);
  }
}

main();
