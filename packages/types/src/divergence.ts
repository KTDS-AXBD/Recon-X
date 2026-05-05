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
  ]),
  sourceFile: z.string(),
  sourceLine: z.number().int().positive(),
  detail: z.string(),
  matchedText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  autoDetected: z.literal(true),
});
export type BLDivergenceMarker = z.infer<typeof BLDivergenceMarkerSchema>;

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
