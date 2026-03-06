import { describe, it, expect } from "vitest";
import { classifySeverity, isTypeCompatible } from "../factcheck/severity.js";

// ── classifySeverity ────────────────────────────────────────────

describe("classifySeverity", () => {
  // ── MID (Missing in Document) ─────────────────────────────────

  describe("MID gaps", () => {
    it("PK 관련 MID → HIGH", () => {
      expect(classifySeverity({ gapType: "MID", isPrimaryKey: true })).toBe("HIGH");
    });

    it("외부 API 누락 → HIGH", () => {
      expect(classifySeverity({ gapType: "MID", isExternalApi: true })).toBe("HIGH");
    });

    it("내부/테스트 API 누락 → LOW", () => {
      expect(classifySeverity({ gapType: "MID", isExternalApi: false })).toBe("LOW");
    });

    it("isExternalApi 미지정 → MEDIUM", () => {
      expect(classifySeverity({ gapType: "MID" })).toBe("MEDIUM");
    });
  });

  // ── MC (Missing Column) ───────────────────────────────────────

  describe("MC gaps", () => {
    it("PK 컬럼 누락 → HIGH", () => {
      expect(classifySeverity({ gapType: "MC", isPrimaryKey: true })).toBe("HIGH");
    });

    it("필수 컬럼 누락 → HIGH", () => {
      expect(classifySeverity({ gapType: "MC", isRequired: true })).toBe("HIGH");
    });

    it("선택 컬럼 누락 → MEDIUM", () => {
      expect(classifySeverity({ gapType: "MC" })).toBe("MEDIUM");
    });
  });

  // ── TM (Type Mismatch) ────────────────────────────────────────

  describe("TM gaps", () => {
    it("PK 타입 불일치 → HIGH", () => {
      expect(classifySeverity({
        gapType: "TM",
        isPrimaryKey: true,
        sourceType: "String",
        docType: "BIGINT",
      })).toBe("HIGH");
    });

    it("호환 가능한 타입 불일치 (Integer↔NUMBER) → MEDIUM", () => {
      expect(classifySeverity({
        gapType: "TM",
        sourceType: "Integer",
        docType: "NUMBER",
      })).toBe("MEDIUM");
    });

    it("비호환 타입 (String↔BIGINT) → HIGH", () => {
      expect(classifySeverity({
        gapType: "TM",
        sourceType: "String",
        docType: "BIGINT",
      })).toBe("HIGH");
    });

    it("타입 정보 없음 → HIGH", () => {
      expect(classifySeverity({ gapType: "TM" })).toBe("HIGH");
    });
  });

  // ── PM (Parameter Mismatch) ───────────────────────────────────

  describe("PM gaps", () => {
    it("필수 파라미터 누락 → HIGH", () => {
      expect(classifySeverity({ gapType: "PM", isRequired: true })).toBe("HIGH");
    });

    it("외부 API 선택 파라미터 → MEDIUM", () => {
      expect(classifySeverity({ gapType: "PM", isExternalApi: true })).toBe("MEDIUM");
    });

    it("기본 PM → MEDIUM", () => {
      expect(classifySeverity({ gapType: "PM" })).toBe("MEDIUM");
    });
  });

  // ── SM (Schema Mismatch) ──────────────────────────────────────

  describe("SM gaps", () => {
    it("PK 스키마 불일치 → HIGH", () => {
      expect(classifySeverity({ gapType: "SM", isPrimaryKey: true })).toBe("HIGH");
    });

    it("필수 컬럼 스키마 불일치 → MEDIUM", () => {
      expect(classifySeverity({ gapType: "SM", isRequired: true })).toBe("MEDIUM");
    });

    it("일반 스키마 불일치 → LOW", () => {
      expect(classifySeverity({ gapType: "SM" })).toBe("LOW");
    });
  });
});

// ── isTypeCompatible ────────────────────────────────────────────

describe("isTypeCompatible", () => {
  describe("호환 타입 (positive)", () => {
    it("String ↔ VARCHAR", () => {
      expect(isTypeCompatible("String", "VARCHAR")).toBe(true);
    });

    it("String ↔ VARCHAR(100) — 길이 제거 후 매칭", () => {
      expect(isTypeCompatible("String", "VARCHAR(100)")).toBe(true);
    });

    it("String ↔ TEXT", () => {
      expect(isTypeCompatible("String", "TEXT")).toBe(true);
    });

    it("String ↔ NVARCHAR", () => {
      expect(isTypeCompatible("String", "NVARCHAR")).toBe(true);
    });

    it("Long ↔ BIGINT", () => {
      expect(isTypeCompatible("Long", "BIGINT")).toBe(true);
    });

    it("Long ↔ NUMBER", () => {
      expect(isTypeCompatible("Long", "NUMBER")).toBe(true);
    });

    it("Integer ↔ INT", () => {
      expect(isTypeCompatible("Integer", "INT")).toBe(true);
    });

    it("Integer ↔ INTEGER", () => {
      expect(isTypeCompatible("Integer", "INTEGER")).toBe(true);
    });

    it("Double ↔ DECIMAL", () => {
      expect(isTypeCompatible("Double", "DECIMAL")).toBe(true);
    });

    it("Double ↔ DECIMAL(10,2) — precision 제거", () => {
      expect(isTypeCompatible("Double", "DECIMAL(10,2)")).toBe(true);
    });

    it("BigDecimal ↔ NUMERIC", () => {
      expect(isTypeCompatible("BigDecimal", "NUMERIC")).toBe(true);
    });

    it("Boolean ↔ BOOLEAN", () => {
      expect(isTypeCompatible("Boolean", "BOOLEAN")).toBe(true);
    });

    it("Boolean ↔ BIT", () => {
      expect(isTypeCompatible("Boolean", "BIT")).toBe(true);
    });

    it("Boolean ↔ CHAR(1)", () => {
      expect(isTypeCompatible("Boolean", "CHAR(1)")).toBe(true);
    });

    it("LocalDate ↔ DATE", () => {
      expect(isTypeCompatible("LocalDate", "DATE")).toBe(true);
    });

    it("LocalDateTime ↔ TIMESTAMP", () => {
      expect(isTypeCompatible("LocalDateTime", "TIMESTAMP")).toBe(true);
    });

    it("Date ↔ DATETIME", () => {
      expect(isTypeCompatible("Date", "DATETIME")).toBe(true);
    });

    it("byte[] ↔ BLOB", () => {
      expect(isTypeCompatible("byte[]", "BLOB")).toBe(true);
    });
  });

  describe("비호환 타입 (negative)", () => {
    it("String ↔ BIGINT", () => {
      expect(isTypeCompatible("String", "BIGINT")).toBe(false);
    });

    it("Long ↔ VARCHAR", () => {
      expect(isTypeCompatible("Long", "VARCHAR")).toBe(false);
    });

    it("Boolean ↔ VARCHAR", () => {
      expect(isTypeCompatible("Boolean", "VARCHAR")).toBe(false);
    });

    it("Integer ↔ DATE", () => {
      expect(isTypeCompatible("Integer", "DATE")).toBe(false);
    });

    it("LocalDate ↔ INT", () => {
      expect(isTypeCompatible("LocalDate", "INT")).toBe(false);
    });
  });

  describe("nullable/generic 제거", () => {
    it("String? ↔ VARCHAR — nullable 제거", () => {
      expect(isTypeCompatible("String?", "VARCHAR")).toBe(true);
    });

    it("Long ↔ BIGINT? — SQL nullable 제거", () => {
      expect(isTypeCompatible("Long", "BIGINT?")).toBe(true);
    });

    it("List<String> → generics 제거 후 비매칭", () => {
      expect(isTypeCompatible("List<String>", "VARCHAR")).toBe(false);
    });
  });
});
