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
import { readFileSync, writeFileSync } from "node:fs";
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
    else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!out.source) {
    process.stderr.write("Error: --source is required\n");
    printUsage();
    process.exit(1);
  }
  return out;
}

function printUsage(): void {
  process.stderr.write(
    `Usage: tsx scripts/divergence/detect-bl.ts \\
  --source <path-to-ts> \\
  [--rules <path-to-md>] \\
  [--provenance <path-to-yaml>] \\
  [--out <output-json>] \\
  [--target-functions <name1,name2>] \\
  [--verbose]\n`,
  );
}

interface PerRuleResult {
  ruleId: string;
  detected: number;
  markers: BLDivergenceMarker[];
  rule?: BLRule;
}

function main(): void {
  const args = parseArgs();

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
