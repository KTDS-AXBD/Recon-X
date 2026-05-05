import { z } from "zod";

/**
 * BL-level DIVERGENCE 자동 검출 마커 (F426, Sprint 259).
 *
 * F354 (Sprint 218) 수동 큐레이션 markers와 구분하기 위해 `autoDetected: true` 필드 명시.
 * F354 수동 markers는 `provenance.yaml`의 `divergenceMarkers` 섹션에 yaml 형식으로 보존됨.
 */
export const BLDivergenceMarkerSchema = z.object({
  ruleId: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  pattern: z.enum([
    "hardcoded_exclusion", // BL-028 — exclusion variable hardcoded to 0
    "under_implementation", // BL-027 — function with too-short body + low branch depth
    "missing_temporal_check", // BL-024 (F427) — 7일 윈도 체크 부재
    "missing_validation_check", // BL-029 (F427) — 만료 거부 체크 부재
    "missing_alt_branch", // BL-026 (F427) — 캐시백 ALT 분기 부재
    "missing_threshold_check", // BL-005~008/BL-015 (F429) — 임계값 비교 부재
    "missing_status_transition", // BL-014 (F429) — status comparison + assignment 부재
    "missing_atomic_transaction", // BL-022 (F429) — db.transaction(...) 부재
  ]),
  sourceFile: z.string(),
  sourceLine: z.number().int().nonnegative(),
  detail: z.string(),
  matchedText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  autoDetected: z.literal(true),
});
export type BLDivergenceMarker = z.infer<typeof BLDivergenceMarkerSchema>;

/**
 * F427 (Sprint 260) — rules.md 마크다운 테이블 파싱 결과.
 * BL-NNN | condition (When) | criteria (If) | outcome (Then) | exception (Else)
 */
/**
 * F428 (Sprint 261) — multi-domain support: optional 1자 prefix(`BL-G001`) + 1~3 digit.
 * lpon-gift `BL-G001~G006` 매칭 + 기존 lpon-refund `BL-020~030` 호환.
 */
export const BLRuleSchema = z.object({
  id: z.string().regex(/^BL-[A-Z]?\d{1,3}$/),
  condition: z.string(),
  criteria: z.string(),
  outcome: z.string(),
  exception: z.string(),
});
export type BLRule = z.infer<typeof BLRuleSchema>;

export const AutoDetectionResultSchema = z.object({
  source: z.string(),
  detector: z.string(),
  markers: z.array(BLDivergenceMarkerSchema),
  metadata: z.object({
    detectorVersion: z.string(),
    measuredAt: z.string(),
  }),
});
export type AutoDetectionResult = z.infer<typeof AutoDetectionResultSchema>;

/**
 * provenance.yaml `divergenceMarkers` 항목 (F354 manual markers) 일부 필드만 정의.
 * 자동 검출 결과와 cross-check할 때 ruleId + status만 필요.
 */
export const ProvenanceMarkerSchema = z.object({
  marker: z.literal("DIVERGENCE"),
  ruleId: z.string(),
  status: z.enum(["OPEN", "RESOLVED"]),
  severity: z.string().optional(),
});
export type ProvenanceMarker = z.infer<typeof ProvenanceMarkerSchema>;

export const CrossCheckRecommendationSchema = z.object({
  ruleId: z.string(),
  manualStatus: z.enum(["OPEN", "RESOLVED"]),
  autoDetectionCount: z.number().int().min(0),
  recommendedStatus: z.enum(["OPEN", "RESOLVED", "UNKNOWN"]),
  detectorSupported: z.boolean(),
  reason: z.string(),
});
export type CrossCheckRecommendation = z.infer<typeof CrossCheckRecommendationSchema>;
