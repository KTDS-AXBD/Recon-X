/**
 * bootstrap-from-zip.ts — AI Foundry 반제품 ZIP → Working Version 부트스트랩 CLI
 *
 * Usage:
 *   bun run scripts/bootstrap-from-zip.ts --zip <path.zip> --output <dir> [--auto] [--verify]
 *
 * Options:
 *   --zip      반제품 ZIP 파일 경로 (필수)
 *   --output   출력 디렉토리 경로 (필수)
 *   --auto     Claude Code CLI로 자동 Working Version 생성
 *   --verify   출력 디렉토리에서 bun install + typecheck 검증
 *
 * Examples:
 *   bun run scripts/bootstrap-from-zip.ts --zip ./prototype.zip --output ./my-project
 *   bun run scripts/bootstrap-from-zip.ts --zip ./prototype.zip --output ./my-project --auto --verify
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { unzipSync, strFromU8 } from "../services/svc-skill/node_modules/fflate/esm/browser.js";

// ── CLI Args ──────────────────────────────────

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    zip: { type: "string" },
    output: { type: "string" },
    auto: { type: "boolean", default: false },
    verify: { type: "boolean", default: false },
  },
  strict: true,
});

function parseArgs(config: {
  args: string[];
  options: Record<string, { type: string; default?: boolean }>;
  strict: boolean;
}): { values: Record<string, string | boolean | undefined> } {
  const result: Record<string, string | boolean | undefined> = {};
  const { args, options } = config;

  // Apply defaults
  for (const [key, opt] of Object.entries(options)) {
    if (opt.default !== undefined) {
      result[key] = opt.default;
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg?.startsWith("--")) {
      if (config.strict) {
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
      }
      continue;
    }

    const key = arg.slice(2);
    const opt = options[key];
    if (!opt) {
      if (config.strict) {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
      }
      continue;
    }

    if (opt.type === "boolean") {
      result[key] = true;
    } else {
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) {
        console.error(`Missing value for --${key}`);
        process.exit(1);
      }
      result[key] = next;
      i++;
    }
  }

  return { values: result };
}

const zipPath = values["zip"] as string | undefined;
const outputDir = values["output"] as string | undefined;
const autoMode = values["auto"] as boolean;
const verifyMode = values["verify"] as boolean;

if (!zipPath || !outputDir) {
  console.error("Usage: bun run scripts/bootstrap-from-zip.ts --zip <path.zip> --output <dir> [--auto] [--verify]");
  process.exit(1);
}

// ── 1. ZIP 읽기 + 해제 ─────────────────────────

const resolvedZip = path.resolve(zipPath);
if (!fs.existsSync(resolvedZip)) {
  console.error(`ZIP 파일을 찾을 수 없어요: ${resolvedZip}`);
  process.exit(1);
}

console.log(`📦 ZIP 읽는 중: ${resolvedZip}`);
const zipBuffer = fs.readFileSync(resolvedZip);
const unzipped = unzipSync(new Uint8Array(zipBuffer));

const fileCount = Object.keys(unzipped).length;
console.log(`   ${fileCount}개 파일 발견`);

// ── 2. 출력 디렉토리 생성 + 파일 배치 ────────────

const resolvedOutput = path.resolve(outputDir);

if (fs.existsSync(resolvedOutput)) {
  console.warn(`⚠️  출력 디렉토리가 이미 존재해요: ${resolvedOutput} — 덮어쓰기 진행`);
}

fs.mkdirSync(resolvedOutput, { recursive: true });

let claudeMdContent = "";
const specFiles: Array<{ name: string; content: string }> = [];

for (const [filePath, data] of Object.entries(unzipped)) {
  const content = strFromU8(data as Uint8Array);
  const destPath = path.join(resolvedOutput, filePath);

  // 디렉토리 생성
  const dir = path.dirname(destPath);
  fs.mkdirSync(dir, { recursive: true });

  // 파일 쓰기
  fs.writeFileSync(destPath, content, "utf-8");
  console.log(`   ✅ ${filePath}`);

  // CLAUDE.md + specs 수집 (auto 모드용)
  if (filePath === "CLAUDE.md") {
    claudeMdContent = content;
  }
  if (filePath.startsWith("specs/") && filePath.endsWith(".md")) {
    specFiles.push({
      name: path.basename(filePath),
      content,
    });
  }
}

console.log(`\n✅ ${fileCount}개 파일을 ${resolvedOutput}에 배치 완료`);

// ── 3. Auto 모드: Claude CLI로 Working Version 생성 ──

if (autoMode) {
  console.log("\n🤖 Auto 모드: Claude Code CLI로 Working Version 생성 중...");

  // 프롬프트 생성: CLAUDE.md 전문 + specs 요약
  const specsSummary = specFiles
    .map((sf) => {
      const truncated = sf.content.length > 500
        ? sf.content.slice(0, 500) + "\n...(truncated)"
        : sf.content;
      return `### ${sf.name}\n${truncated}`;
    })
    .join("\n\n");

  const prompt = [
    "아래는 AI Foundry 반제품 스펙이에요. 이 스펙을 기반으로 Working Version을 생성해줘.",
    "",
    "## CLAUDE.md (프로젝트 설정)",
    claudeMdContent,
    "",
    "## Specs 요약",
    specsSummary,
    "",
    "## 지시사항",
    "1. CLAUDE.md의 '구현 순서'를 따라 프로젝트를 부트스트래핑해줘",
    "2. specs/02-data-model.md의 SQL로 DB 스키마를 생성해줘",
    "3. BL-NNN 비즈니스 로직을 Domain 레이어에 구현해줘",
    "4. FN-NNN 서비스 함수를 Application 레이어에 구현해줘",
    "5. API 엔드포인트를 specs/05-api.md 기반으로 구현해줘",
    "6. 각 BL 시나리오별 단위 테스트를 작성해줘",
  ].join("\n");

  try {
    execFileSync("claude", ["-p", prompt, "--cwd", resolvedOutput], {
      stdio: "inherit",
      timeout: 600_000, // 10분
    });
    console.log("\n✅ Claude Code CLI 실행 완료");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      console.error("\n❌ claude CLI를 찾을 수 없어요.");
      console.error("   설치: npm install -g @anthropic-ai/claude-code");
      console.error("   또는: https://docs.anthropic.com/en/docs/claude-code");
    } else {
      console.error("\n❌ Claude Code CLI 실행 실패:", error);
    }
  }
}

// ── 4. Verify 모드: 검증 ────────────────────────

if (verifyMode) {
  console.log("\n🔍 Verify 모드: 프로젝트 검증 중...");

  // package.json 존재 여부 확인
  const pkgJsonPath = path.join(resolvedOutput, "package.json");
  if (!fs.existsSync(pkgJsonPath)) {
    console.warn("   ⚠️  package.json이 없어요 — bun install 건너뜀");
    console.log("   (auto 모드로 먼저 프로젝트를 생성해주세요)");
  } else {
    try {
      console.log("   📦 bun install 실행 중...");
      execFileSync("bun", ["install"], {
        cwd: resolvedOutput,
        stdio: "inherit",
        timeout: 120_000,
      });
      console.log("   ✅ bun install 성공");
    } catch {
      console.error("   ❌ bun install 실패");
    }

    // typecheck 시도
    const tsconfigPath = path.join(resolvedOutput, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      try {
        console.log("   🔎 typecheck 실행 중...");
        execFileSync("bun", ["run", "typecheck"], {
          cwd: resolvedOutput,
          stdio: "inherit",
          timeout: 120_000,
        });
        console.log("   ✅ typecheck 성공");
      } catch {
        console.error("   ⚠️  typecheck 실패 (Working Version 생성 후 수정 필요)");
      }
    }
  }
}

console.log("\n🎉 부트스트랩 완료!");
console.log(`   📁 프로젝트: ${resolvedOutput}`);
if (!autoMode) {
  console.log("   💡 --auto 옵션으로 Claude Code가 자동으로 Working Version을 생성할 수 있어요");
}

// ── Helpers ─────────────────────────────────────

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
