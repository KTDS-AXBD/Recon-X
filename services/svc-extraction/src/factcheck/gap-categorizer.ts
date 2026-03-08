/**
 * Gap Categorizer — 도메인별 Gap 분류 및 노이즈 탐지.
 *
 * 1. isNoiseTable() — SQL 아티팩트, 시스템 테이블, 변수명 등 필터
 * 2. isNoiseApi() — 테스트/유틸/중복 경로 필터
 * 3. categorizeGapDomain() — 컨트롤러/경로 기반 비즈니스 도메인 분류
 * 4. buildDomainSummary() — 도메인별 집계
 */

import type { FactCheckGap } from "@ai-foundry/types";
import type { SourceApi, SourceTable } from "./types.js";

// ── Noise Detection ──────────────────────────────────────────────

/** Known Oracle/SQL system tables and keywords */
const SYSTEM_TABLE_NAMES = new Set([
  "dual", "sysibm", "information_schema", "all_tables", "user_tables",
]);

/** Single-char names that are SQL aliases, not tables */
const SQL_ALIAS_PATTERN = /^[a-zA-Z]$/;

/** SQL keywords commonly misidentified as table names */
const SQL_KEYWORDS = new Set([
  "set", "select", "from", "where", "insert", "update", "delete",
  "values", "into", "table", "create", "alter", "drop", "index",
]);

/** camelCase pattern (starts lowercase, has uppercase) → Java variable, not table */
const CAMEL_CASE_PATTERN = /^[a-z]+[A-Z]/;

/**
 * Detect if a source table is noise (not a real table).
 * Returns a noise reason string, or null if it's a real table.
 */
export function isNoiseTable(table: SourceTable): string | null {
  const name = table.tableName;
  const nameLower = name.toLowerCase();

  // System tables (dual, DUAL, etc.)
  if (SYSTEM_TABLE_NAMES.has(nameLower)) {
    return "system_table";
  }

  // SQL alias (single character)
  if (SQL_ALIAS_PATTERN.test(name)) {
    return "sql_alias";
  }

  // SQL keywords used as table names
  if (SQL_KEYWORDS.has(nameLower)) {
    return "sql_keyword";
  }

  // camelCase variable names with 0 columns (e.g., walletNo, appService)
  if (CAMEL_CASE_PATTERN.test(name) && table.columns.length === 0) {
    return "variable_name";
  }

  // 0-column tables that are likely MyBatis SELECT-only references
  // (not noise per se, but downgrade severity — handled by caller)

  return null;
}

/** Test/utility/sandbox API path patterns */
const NOISE_API_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\/test(?:$|\/)/i, reason: "test_endpoint" },
  { pattern: /\/example\//i, reason: "example_endpoint" },
  { pattern: /\/metrics\//i, reason: "metrics_endpoint" },
  { pattern: /\/error$/i, reason: "error_handler" },
  { pattern: /\/health/i, reason: "health_check" },
  { pattern: /\/debug/i, reason: "debug_endpoint" },
  { pattern: /\/internal\//i, reason: "internal_endpoint" },
  { pattern: /\/getCSRFToken$/i, reason: "utility_endpoint" },
  { pattern: /\/rsa\//i, reason: "utility_endpoint" },
  { pattern: /\/getIPAddr$/i, reason: "utility_endpoint" },
  { pattern: /\/raon\//i, reason: "security_utility" },
];

/** Controller class names that are system/test */
const NOISE_CONTROLLERS = new Set([
  "exceptionhandlingcontroller",
  "healthcheckcontroller",
  "sandboxcontroller",
  "examplecontroller",
]);

/**
 * Detect if a source API is noise (test/utility/system).
 * Returns a noise reason string, or null if it's a real API.
 */
export function isNoiseApi(api: SourceApi): string | null {
  // Check controller name
  if (NOISE_CONTROLLERS.has(api.controllerClass.toLowerCase())) {
    return "noise_controller";
  }

  // Check path patterns
  for (const { pattern, reason } of NOISE_API_PATTERNS) {
    if (pattern.test(api.path)) {
      return reason;
    }
  }

  // Duplicate/nested path detection (e.g., /utils/getNow/utils/getNow)
  const segments = api.path.split("/").filter(Boolean);
  if (segments.length >= 4) {
    const half = Math.floor(segments.length / 2);
    const firstHalf = segments.slice(0, half).join("/");
    const secondHalf = segments.slice(half).join("/");
    if (firstHalf === secondHalf) {
      return "duplicate_path";
    }
  }

  return null;
}

// ── Domain Categorization ────────────────────────────────────────

export type GapDomain =
  | "charge"       // 충전/결제
  | "gift"         // 선물/쿠폰
  | "payment"      // 결제 처리
  | "member"       // 회원 관리
  | "auth"         // 인증/로그인
  | "wallet"       // 지갑/잔액
  | "store"        // 가맹점
  | "settlement"   // 정산
  | "message"      // 메시지/알림
  | "batch"        // 배치/스케줄
  | "admin"        // 관리/수동 조작
  | "openbank"     // 오픈뱅킹
  | "point"        // 포인트
  | "common"       // 공통/유틸
  | "deal"         // 거래 내역
  | "data"         // 데이터/테이블
  | "unknown";     // 미분류

interface DomainRule {
  domain: GapDomain;
  pathPatterns?: RegExp[];
  controllerPatterns?: RegExp[];
  tablePatterns?: RegExp[];
}

const DOMAIN_RULES: DomainRule[] = [
  {
    domain: "charge",
    pathPatterns: [/\/charge/i, /\/chargeDealing/i, /\/comCharge/i],
    controllerPatterns: [/charge/i],
    tablePatterns: [/charg/i, /auto_charg/i],
  },
  {
    domain: "gift",
    pathPatterns: [/\/gift/i, /\/coupon/i, /\/voucher/i],
    controllerPatterns: [/gift/i, /coupon/i],
    tablePatterns: [/cpn_/i, /gift/i, /coupon/i, /voucher/i],
  },
  {
    domain: "payment",
    pathPatterns: [/\/pay/i, /\/approval/i],
    controllerPatterns: [/pay/i, /approval/i],
    tablePatterns: [/pay/i, /approval/i],
  },
  {
    domain: "member",
    pathPatterns: [/\/join$/i, /\/mp\//i, /\/member/i, /\/withdraw/i, /\/company/i, /\/employee/i, /\/franchise/i],
    controllerPatterns: [/member/i, /company/i, /employee/i, /franchise/i],
    tablePatterns: [/member/i, /parties/i, /franchise/i, /employee/i],
  },
  {
    domain: "auth",
    pathPatterns: [/\/auth\//i, /\/login/i, /\/password/i, /\/kmc\//i],
    controllerPatterns: [/auth/i, /login/i, /kmc/i, /rsa/i],
    tablePatterns: [/login/i, /clause_agree/i],
  },
  {
    domain: "wallet",
    pathPatterns: [/\/wallet/i, /\/balance/i, /\/money\//i],
    controllerPatterns: [/wallet/i, /money/i],
    tablePatterns: [/wallet/i, /balance/i, /ledger/i, /monetary/i],
  },
  {
    domain: "store",
    pathPatterns: [/\/store/i, /\/parties/i],
    controllerPatterns: [/parties/i, /gis/i],
    tablePatterns: [/store/i, /parties/i],
  },
  {
    domain: "settlement",
    pathPatterns: [/\/transfer/i, /\/settleBank/i, /\/openbank/i],
    controllerPatterns: [/settlebank/i, /openbank/i],
    tablePatterns: [/stlm/i, /settlement/i, /deposit/i, /vrtl_acnt/i, /nbkk/i],
  },
  {
    domain: "message",
    pathPatterns: [/\/message/i, /\/extMessage/i, /\/v[12]\/messages/i, /\/send/i],
    controllerPatterns: [/message/i, /send/i, /producer/i],
    tablePatterns: [/message/i, /schedule_msg/i, /schedule_recipient/i, /recipient_info/i],
  },
  {
    domain: "batch",
    pathPatterns: [/\/extBatch/i, /\/batch/i, /\/api\/run/i],
    controllerPatterns: [/batch/i, /joblauncher/i],
    tablePatterns: [/batch/i, /stast_batch/i],
  },
  {
    domain: "admin",
    pathPatterns: [/\/manual\//i, /\/masking/i, /\/status/i, /\/reset/i],
    controllerPatterns: [/manual/i, /masking/i],
    tablePatterns: [/ma_sta/i, /pre_data/i],
  },
  {
    domain: "point",
    pathPatterns: [/\/point/i],
    controllerPatterns: [/point/i],
    tablePatterns: [/point/i, /accml/i],
  },
  {
    domain: "deal",
    pathPatterns: [/\/deal/i, /\/cashBack/i, /\/ledger/i, /\/refund/i],
    controllerPatterns: [/deal/i, /ledger/i],
    tablePatterns: [/deal/i, /transaction/i, /refund/i, /ledger/i],
  },
  {
    domain: "common",
    pathPatterns: [/\/common\//i, /\/front\//i, /\/app\//i, /\/utils\//i],
    controllerPatterns: [/common/i, /front/i],
    tablePatterns: [/com_code/i, /app_version/i, /notice/i, /board/i, /banner/i, /event/i],
  },
  {
    domain: "data",
    tablePatterns: [/card/i, /account/i, /budget/i, /policy/i, /receipt/i, /temp_/i, /api_req/i, /xroshot/i],
  },
];

/**
 * Categorize a gap into a business domain.
 */
export function categorizeGapDomain(gap: FactCheckGap): GapDomain {
  const desc = gap.description;

  // Parse source item for controller/path/table info
  let path = "";
  let controller = "";
  let tableName = "";

  try {
    const parsed = JSON.parse(gap.sourceItem) as Record<string, unknown>;
    path = (parsed["path"] as string) ?? "";
    controller = (parsed["controller"] as string) ?? "";
    tableName = (parsed["tableName"] as string) ?? "";
  } catch {
    // sourceItem might not be valid JSON in MC gaps
  }

  // Also extract from description
  const apiMatch = desc.match(/API '([^']+)'/);
  if (apiMatch?.[1] && !path) path = apiMatch[1];

  const tableMatch = desc.match(/테이블 '([^']+)'/);
  if (tableMatch?.[1] && !tableName) tableName = tableMatch[1];

  const ctrlMatch = desc.match(/\((\w+Controller)\.\w+\)/);
  if (ctrlMatch?.[1] && !controller) controller = ctrlMatch[1];

  // Try to match against domain rules
  for (const rule of DOMAIN_RULES) {
    if (path && rule.pathPatterns) {
      for (const pattern of rule.pathPatterns) {
        if (pattern.test(path)) return rule.domain;
      }
    }
    if (controller && rule.controllerPatterns) {
      for (const pattern of rule.controllerPatterns) {
        if (pattern.test(controller)) return rule.domain;
      }
    }
    if (tableName && rule.tablePatterns) {
      for (const pattern of rule.tablePatterns) {
        if (pattern.test(tableName)) return rule.domain;
      }
    }
  }

  return "unknown";
}

// ── Domain Summary ───────────────────────────────────────────────

export interface DomainGapSummary {
  domain: GapDomain;
  label: string;
  totalGaps: number;
  highGaps: number;
  mediumGaps: number;
  lowGaps: number;
  noiseGaps: number;
  gapTypes: Record<string, number>;
  sampleDescriptions: string[];
}

const DOMAIN_LABELS: Record<GapDomain, string> = {
  charge: "충전/결제",
  gift: "선물/쿠폰",
  payment: "결제 처리",
  member: "회원 관리",
  auth: "인증/로그인",
  wallet: "지갑/잔액",
  store: "가맹점",
  settlement: "정산/뱅킹",
  message: "메시지/알림",
  batch: "배치/스케줄",
  admin: "관리/수동 조작",
  openbank: "오픈뱅킹",
  point: "포인트",
  common: "공통/유틸",
  deal: "거래 내역",
  data: "데이터 모델",
  unknown: "미분류",
};

/**
 * Build a per-domain summary from a list of gaps.
 */
export function buildDomainSummary(
  gaps: FactCheckGap[],
  noiseGapIds: Set<string>,
): DomainGapSummary[] {
  const domainMap = new Map<GapDomain, FactCheckGap[]>();

  for (const gap of gaps) {
    const domain = categorizeGapDomain(gap);
    const existing = domainMap.get(domain) ?? [];
    existing.push(gap);
    domainMap.set(domain, existing);
  }

  const summaries: DomainGapSummary[] = [];

  for (const [domain, domainGaps] of domainMap) {
    const gapTypes: Record<string, number> = {};
    let highGaps = 0;
    let mediumGaps = 0;
    let lowGaps = 0;
    let noiseCount = 0;

    const sampleDescriptions: string[] = [];

    for (const gap of domainGaps) {
      gapTypes[gap.gapType] = (gapTypes[gap.gapType] ?? 0) + 1;

      if (noiseGapIds.has(gap.gapId)) {
        noiseCount++;
        continue;
      }

      switch (gap.severity) {
        case "HIGH": highGaps++; break;
        case "MEDIUM": mediumGaps++; break;
        case "LOW": lowGaps++; break;
      }

      if (sampleDescriptions.length < 3) {
        sampleDescriptions.push(gap.description);
      }
    }

    summaries.push({
      domain,
      label: DOMAIN_LABELS[domain],
      totalGaps: domainGaps.length,
      highGaps,
      mediumGaps,
      lowGaps,
      noiseGaps: noiseCount,
      gapTypes,
      sampleDescriptions,
    });
  }

  // Sort by total gaps descending
  summaries.sort((a, b) => b.totalGaps - a.totalGaps);

  return summaries;
}
