/**
 * Severity Classification — Gap 심각도 분류 및 Java↔SQL 타입 호환성 검사.
 *
 * Rules:
 * - HIGH: PK mismatch, external API missing required param, core table MID, FK broken
 * - MEDIUM: type mismatch (compatible but different), optional param missing, nullable diff
 * - LOW: naming convention only, description-only diff, test/internal utility API missing
 */

import type { GapSeverity, GapType } from "@ai-foundry/types";

// ── Java↔SQL Type Mapping ───────────────────────────────────────

const JAVA_SQL_TYPE_MAP: Record<string, string[]> = {
  "String": ["VARCHAR", "CHAR", "TEXT", "NVARCHAR", "CLOB"],
  "Long": ["BIGINT", "NUMBER", "NUMERIC", "INT8"],
  "Integer": ["INT", "INTEGER", "NUMBER", "INT4"],
  "Double": ["DOUBLE", "DECIMAL", "FLOAT", "NUMBER", "NUMERIC"],
  "BigDecimal": ["DECIMAL", "NUMERIC", "NUMBER"],
  "Boolean": ["BOOLEAN", "BIT", "TINYINT", "CHAR(1)"],
  "LocalDate": ["DATE"],
  "LocalDateTime": ["DATETIME", "TIMESTAMP"],
  "Date": ["DATE", "DATETIME", "TIMESTAMP"],
  "byte[]": ["BLOB", "BYTEA", "BINARY", "VARBINARY"],
};

// ── Severity Context ────────────────────────────────────────────

export interface SeverityContext {
  gapType: GapType;
  isPrimaryKey?: boolean | undefined;
  isRequired?: boolean | undefined;
  isExternalApi?: boolean | undefined;
  sourceType?: string | undefined;
  docType?: string | undefined;
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Classify the severity of a gap based on its context.
 */
export function classifySeverity(ctx: SeverityContext): GapSeverity {
  const { gapType, isPrimaryKey, isRequired, isExternalApi } = ctx;

  // MID — Missing in Document
  if (gapType === "MID") {
    // Core table entirely missing → HIGH
    if (isPrimaryKey) return "HIGH";
    // External API missing → HIGH
    if (isExternalApi) return "HIGH";
    // Test/internal utility API → LOW
    if (!isExternalApi && isExternalApi !== undefined) return "LOW";
    return "MEDIUM";
  }

  // MC — Missing Column (doc has it but source doesn't, or vice versa)
  if (gapType === "MC") {
    if (isPrimaryKey) return "HIGH";
    if (isRequired) return "HIGH";
    return "MEDIUM";
  }

  // TM — Type Mismatch
  if (gapType === "TM") {
    if (isPrimaryKey) return "HIGH";
    // If types are compatible (e.g., Integer↔INT), it's MEDIUM; otherwise HIGH
    if (ctx.sourceType && ctx.docType) {
      if (isTypeCompatible(ctx.sourceType, ctx.docType)) return "MEDIUM";
    }
    return "HIGH";
  }

  // PM — Parameter Mismatch
  if (gapType === "PM") {
    if (isRequired) return "HIGH";
    if (isExternalApi) return "MEDIUM";
    return "MEDIUM";
  }

  // SM — Schema Mismatch (column in one side but not the other)
  if (gapType === "SM") {
    if (isPrimaryKey) return "HIGH";
    if (isRequired) return "MEDIUM";
    return "LOW";
  }

  return "MEDIUM";
}

/**
 * Check if a Java type is compatible with a SQL type.
 * Strips nullable markers (?) and type length info (e.g., VARCHAR(100) → VARCHAR).
 */
export function isTypeCompatible(javaType: string, sqlType: string): boolean {
  const normalizedJava = normalizeJavaType(javaType);
  const normalizedSql = normalizeSqlType(sqlType);

  // Direct match after normalization
  if (normalizedJava.toUpperCase() === normalizedSql.toUpperCase()) return true;

  // Check Java→SQL mapping
  for (const [java, sqlTypes] of Object.entries(JAVA_SQL_TYPE_MAP)) {
    if (java.toLowerCase() === normalizedJava.toLowerCase()) {
      return sqlTypes.some((st) => st.toUpperCase() === normalizedSql.toUpperCase());
    }
  }

  return false;
}

// ── Internal helpers ────────────────────────────────────────────

/**
 * Normalize a Java type by stripping nullable and generic wrappers.
 * e.g., "String?" → "String", "List<String>" → "List"
 */
function normalizeJavaType(javaType: string): string {
  return javaType
    .replace(/\?$/, "")           // strip nullable marker
    .replace(/<.*>$/, "")         // strip generics
    .replace(/\s+/g, "")         // strip whitespace
    .trim();
}

/**
 * Normalize a SQL type by stripping length/precision info.
 * e.g., "VARCHAR(100)" → "VARCHAR", "DECIMAL(10,2)" → "DECIMAL", "CHAR(1)" → "CHAR"
 *
 * Special case: "CHAR(1)" is kept as-is for Boolean mapping (handled in isTypeCompatible).
 */
function normalizeSqlType(sqlType: string): string {
  const trimmed = sqlType.replace(/\?$/, "").trim().toUpperCase();

  // Special case: CHAR(1) maps to Boolean — keep as-is for mapping lookup
  if (trimmed === "CHAR(1)") return "CHAR(1)";

  // Strip length/precision info: VARCHAR(100) → VARCHAR, DECIMAL(10,2) → DECIMAL
  return trimmed.replace(/\(.*\)$/, "");
}
