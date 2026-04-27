/**
 * Central Claude model ID constants — **Single Source of Truth (SSOT)**.
 *
 * Anthropic Direct API는 undated alias(`claude-sonnet`, `claude-haiku`)를
 * 지원하지 않고 구체 family 버전(`claude-sonnet-4-6`)이 필요하다.
 * 따라서 이 파일이 프로젝트 전체 SDK/HTTP 호출의 SSOT 역할을 한다.
 *
 * KT DS Foundry-X(`packages/shared/src/model-defaults.ts`)와 동일 값을 유지하여
 * Decode-X → Foundry-X handoff 시 모델 호환을 보장한다.
 *
 * ## 업그레이드 절차 (Anthropic이 새 minor release 공표 시)
 * 1. 이 파일의 버전 번호 1곳만 수정 (예: `claude-sonnet-4-6` → `claude-sonnet-4-7`)
 * 2. `pnpm typecheck` — import consumer 전파 확인
 * 3. `/ax:daily-check` Sonnet alias 항목으로 신규 alias 일치 확인
 *
 * ## CLI 경로 (별도 관리)
 * Claude Code CLI는 `--model sonnet` alias 지원 → CLI 스크립트는
 * `sonnet`/`opus`/`haiku` alias 사용으로 자동 현행화.
 *
 * @example
 *   // Direct Anthropic API
 *   import { MODEL_SONNET } from "@ai-foundry/types";
 *   // OpenRouter slug
 *   import { OR_MODEL_HAIKU } from "@ai-foundry/types";
 */

// ── Direct Anthropic API ──────────────────────────────────────
export const MODEL_OPUS = "claude-opus-4-7" as const;
export const MODEL_SONNET = "claude-sonnet-4-6" as const;
export const MODEL_HAIKU = "claude-haiku-4-5" as const;

// ── OpenRouter-prefixed ───────────────────────────────────────
export const OR_MODEL_OPUS = `anthropic/${MODEL_OPUS}` as const;
export const OR_MODEL_SONNET = `anthropic/${MODEL_SONNET}` as const;
export const OR_MODEL_HAIKU = `anthropic/${MODEL_HAIKU}` as const;
