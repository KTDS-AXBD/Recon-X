/**
 * F426 (Sprint 259) — BL-level DIVERGENCE 자동 검출 CLI.
 *
 * Usage:
 *   tsx scripts/divergence/detect-bl.ts \
 *     --source <path-to-ts> \
 *     [--provenance <path-to-yaml>] \
 *     [--out <output-json>] \
 *     [--target-functions <name1,name2>] \
 *     [--verbose]
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  detectHardCodedExclusion,
  detectUnderImplementation,
  parseTypeScriptSource,
  crossCheck,
} from "../../packages/utils/src/divergence/index.js";
import type { BLDivergenceMarker, CrossCheckRecommendation } from "../../packages/types/src/index.js";

interface CliArgs {
  source: string;
  provenance: string;
  out: string;
  targetFunctions: string[];
  verbose: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = {
    source: "",
    provenance: "",
    out: "",
    targetFunctions: [],
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--source") out.source = args[++i] ?? "";
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
  [--provenance <path-to-yaml>] \\
  [--out <output-json>] \\
  [--target-functions <name1,name2>] \\
  [--verbose]\n`,
  );
}

function main(): void {
  const args = parseArgs();

  const sourceText = readFileSync(args.source, "utf8");
  const sf = parseTypeScriptSource(args.source, sourceText);

  const bl028: BLDivergenceMarker[] = detectHardCodedExclusion(sf, args.source);
  const bl027: BLDivergenceMarker[] = detectUnderImplementation(sf, args.source, {
    targetFunctionNames: args.targetFunctions.length > 0 ? args.targetFunctions : undefined,
  });

  let recommendations: CrossCheckRecommendation[] = [];
  let provenanceRead = false;
  if (args.provenance) {
    const yamlText = readFileSync(args.provenance, "utf8");
    recommendations = crossCheck(yamlText, [...bl028, ...bl027]);
    provenanceRead = true;
  }

  const result = {
    source: args.source,
    measuredAt: new Date().toISOString(),
    detectorVersion: "1.0.0",
    bl028: {
      detector: "BL-028 hardcoded_exclusion",
      markers: bl028,
      count: bl028.length,
    },
    bl027: {
      detector: "BL-027 under_implementation",
      markers: bl027,
      count: bl027.length,
      options: {
        targetFunctions: args.targetFunctions,
        minBodyLines: 10,
        minBranchDepth: 2,
      },
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
            regressionRisk: recommendations.filter(
              (r) => r.manualStatus === "RESOLVED" && r.recommendedStatus === "OPEN",
            ).length,
          },
        }
      : null,
    summary: {
      totalMarkers: bl028.length + bl027.length,
      bl028Count: bl028.length,
      bl027Count: bl027.length,
    },
  };

  // Stdout summary
  process.stdout.write(`=== BL Detector — ${args.source} ===\n`);
  process.stdout.write(`  BL-028: ${bl028.length} detection(s)\n`);
  for (const m of bl028) {
    process.stdout.write(`    L${m.sourceLine}: ${m.matchedText}\n`);
  }
  process.stdout.write(`  BL-027: ${bl027.length} detection(s)\n`);
  for (const m of bl027) {
    process.stdout.write(`    L${m.sourceLine}: ${m.matchedText} — ${m.detail}\n`);
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
