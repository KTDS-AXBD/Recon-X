import { SKILL_CATEGORIES } from "../bundler/categories.js";

// Domain vocabulary is authored in bundler/categories.ts (SSOT).
// Flatten all category keywords into a single set for matching against policy text.
export const DOMAIN_KEYWORDS: readonly string[] = Object.values(SKILL_CATEGORIES)
  .flatMap((c) => [...c.keywords] as string[])
  .filter((k) => k.length > 0);

export const DOMAIN_KEYWORD_SET: ReadonlySet<string> = new Set(DOMAIN_KEYWORDS);

// ── Technical-dimension signals ──────────────────────────────────────
export const API_PATTERN = /\b(api|endpoint|POST|GET|PUT|DELETE|PATCH|REST)\b|\/api\//i;

export const TECHNICAL_SCHEMA_KEYWORDS: readonly string[] = [
  "테이블",
  "컬럼",
  "스키마",
  "ERD",
  "DDL",
  "필드",
  "인덱스",
  "제약조건",
  "PK",
  "FK",
];

// camelCase or snake_case identifier: ≥2 segments, no whitespace
export const CAMEL_CASE_PATTERN = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]+\b/;
export const SNAKE_CASE_PATTERN = /\b[a-z][a-z0-9]+_[a-z0-9_]+\b/;

// ── Quality-dimension signals ────────────────────────────────────────
export const QUALITY_KEYWORDS: readonly string[] = [
  "이내",
  "이상",
  "이하",
  "초과",
  "미만",
  "TPS",
  "RPS",
  "QPS",
  "latency",
  "응답시간",
  "암호화",
  "마스킹",
  "감사",
  "로그",
  "SLA",
  "가용성",
  "무중단",
  "성능",
  "보안",
  "테스트",
  "검증",
];

// ── Helpers ──────────────────────────────────────────────────────────
export function hasAnyKeyword(text: string, keywords: readonly string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export function countKeywordHits(text: string, keywords: readonly string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  return keywords.reduce((n, k) => (lower.includes(k.toLowerCase()) ? n + 1 : n), 0);
}

// Matches digits followed by a domain unit: 10%, 500원, 3일, 6개월 etc.
export const NUMERIC_CRITERIA_PATTERN = /\d+\s*(%|원|만원|억원|천원|일|년|개월|건|회|명|점|명|시간|분|초|세|kg|km|m)/;
