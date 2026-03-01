import { describe, it, expect } from "vitest";
import { PII_PATTERNS, type PiiPattern } from "../masking/patterns.js";

// ── Helpers ──────────────────────────────────────────────────────

/** Find the pattern by entityType name */
function getPattern(entityType: string): PiiPattern {
  const p = PII_PATTERNS.find((pat) => pat.entityType === entityType);
  if (!p) throw new Error(`Pattern not found: ${entityType}`);
  return p;
}

/** Extract all matches for a given pattern from text */
function matchAll(pattern: PiiPattern, text: string): string[] {
  pattern.regex.lastIndex = 0;
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.regex.exec(text)) !== null) {
    results.push(m[0]);
  }
  return results;
}

// ── PII_SSN ─────────────────────────────────────────────────────

describe("PII_SSN pattern", () => {
  const pattern = getPattern("PII_SSN");

  it("matches a valid SSN starting with 1 (male, born before 2000)", () => {
    const matches = matchAll(pattern, "901231-1234567");
    expect(matches).toEqual(["901231-1234567"]);
  });

  it("matches a valid SSN starting with 2 (female, born before 2000)", () => {
    const matches = matchAll(pattern, "901231-2345678");
    expect(matches).toEqual(["901231-2345678"]);
  });

  it("matches a valid SSN starting with 3 (male, born after 2000)", () => {
    const matches = matchAll(pattern, "050101-3123456");
    expect(matches).toEqual(["050101-3123456"]);
  });

  it("matches a valid SSN starting with 4 (female, born after 2000)", () => {
    const matches = matchAll(pattern, "050101-4123456");
    expect(matches).toEqual(["050101-4123456"]);
  });

  it("does not match when second segment starts with 5-9 (that is CORP_ID)", () => {
    const matches = matchAll(pattern, "123456-5678901");
    expect(matches).toHaveLength(0);
  });

  it("does not match when second segment starts with 0", () => {
    const matches = matchAll(pattern, "901231-0234567");
    expect(matches).toHaveLength(0);
  });

  it("does not match numbers of wrong length", () => {
    const matches = matchAll(pattern, "90123-1234567");
    expect(matches).toHaveLength(0);
  });

  it("does not match without hyphen", () => {
    const matches = matchAll(pattern, "9012311234567");
    expect(matches).toHaveLength(0);
  });

  it("matches multiple SSNs in one text", () => {
    const text = "A: 901231-1234567, B: 880512-2345678";
    const matches = matchAll(pattern, text);
    expect(matches).toEqual(["901231-1234567", "880512-2345678"]);
  });

  it("does not match if second part has fewer than 7 digits", () => {
    const matches = matchAll(pattern, "901231-123456");
    expect(matches).toHaveLength(0);
  });
});

// ── PII_CORP_ID ─────────────────────────────────────────────────

describe("PII_CORP_ID pattern", () => {
  const pattern = getPattern("PII_CORP_ID");

  it("matches a CORP_ID starting with 5", () => {
    const matches = matchAll(pattern, "123456-5678901");
    expect(matches).toEqual(["123456-5678901"]);
  });

  it("matches a CORP_ID starting with 6", () => {
    const matches = matchAll(pattern, "123456-6789012");
    expect(matches).toEqual(["123456-6789012"]);
  });

  it("matches a CORP_ID starting with 9", () => {
    const matches = matchAll(pattern, "123456-9000000");
    expect(matches).toEqual(["123456-9000000"]);
  });

  it("does not match when second segment starts with 1-4 (that is SSN)", () => {
    const matches = matchAll(pattern, "123456-1234567");
    expect(matches).toHaveLength(0);
  });

  it("does not match wrong-length numbers", () => {
    const matches = matchAll(pattern, "12345-5678901");
    expect(matches).toHaveLength(0);
  });
});

// ── PII_CARD ────────────────────────────────────────────────────

describe("PII_CARD pattern", () => {
  const pattern = getPattern("PII_CARD");

  it("matches a standard 4-4-4-4 card number", () => {
    const matches = matchAll(pattern, "1234-5678-9012-3456");
    expect(matches).toEqual(["1234-5678-9012-3456"]);
  });

  it("does not match 3-4-4-4 format", () => {
    const matches = matchAll(pattern, "123-5678-9012-3456");
    expect(matches).toHaveLength(0);
  });

  it("does not match without hyphens", () => {
    const matches = matchAll(pattern, "1234567890123456");
    expect(matches).toHaveLength(0);
  });

  it("matches multiple card numbers", () => {
    const text = "A: 1111-2222-3333-4444, B: 5555-6666-7777-8888";
    const matches = matchAll(pattern, text);
    expect(matches).toEqual(["1111-2222-3333-4444", "5555-6666-7777-8888"]);
  });
});

// ── PII_PHONE ───────────────────────────────────────────────────

describe("PII_PHONE pattern", () => {
  const pattern = getPattern("PII_PHONE");

  it("matches mobile number 010-xxxx-xxxx", () => {
    const matches = matchAll(pattern, "010-1234-5678");
    expect(matches).toEqual(["010-1234-5678"]);
  });

  it("matches landline with 02 prefix (Seoul)", () => {
    const matches = matchAll(pattern, "02-1234-5678");
    expect(matches).toEqual(["02-1234-5678"]);
  });

  it("matches landline with 3-digit prefix and 3-digit middle", () => {
    const matches = matchAll(pattern, "031-123-4567");
    expect(matches).toEqual(["031-123-4567"]);
  });

  it("matches landline with 3-digit prefix and 4-digit middle", () => {
    const matches = matchAll(pattern, "031-1234-5678");
    expect(matches).toEqual(["031-1234-5678"]);
  });

  it("does not match if first segment does not start with 0", () => {
    const matches = matchAll(pattern, "110-1234-5678");
    expect(matches).toHaveLength(0);
  });

  it("does not match incomplete phone numbers", () => {
    const matches = matchAll(pattern, "010-12-3456");
    expect(matches).toHaveLength(0);
  });

  it("matches multiple phone numbers in text", () => {
    const text = "010-9999-8888, 02-555-1234";
    const matches = matchAll(pattern, text);
    expect(matches).toEqual(["010-9999-8888", "02-555-1234"]);
  });
});

// ── PII_EMAIL ───────────────────────────────────────────────────

describe("PII_EMAIL pattern", () => {
  const pattern = getPattern("PII_EMAIL");

  it("matches a standard email address", () => {
    const matches = matchAll(pattern, "user@example.com");
    expect(matches).toEqual(["user@example.com"]);
  });

  it("matches email with dots in local part", () => {
    const matches = matchAll(pattern, "first.last@company.co.kr");
    expect(matches).toEqual(["first.last@company.co.kr"]);
  });

  it("matches email with plus sign", () => {
    const matches = matchAll(pattern, "user+tag@gmail.com");
    expect(matches).toEqual(["user+tag@gmail.com"]);
  });

  it("matches email with hyphens", () => {
    const matches = matchAll(pattern, "user-name@my-domain.org");
    expect(matches).toEqual(["user-name@my-domain.org"]);
  });

  it("matches email with underscores", () => {
    const matches = matchAll(pattern, "user_name@domain.net");
    expect(matches).toEqual(["user_name@domain.net"]);
  });

  it("matches email with percent sign", () => {
    const matches = matchAll(pattern, "user%name@domain.com");
    expect(matches).toEqual(["user%name@domain.com"]);
  });

  it("does not match text without @ sign", () => {
    const matches = matchAll(pattern, "not an email address");
    expect(matches).toHaveLength(0);
  });

  it("does not match text without domain extension", () => {
    const matches = matchAll(pattern, "user@domain");
    expect(matches).toHaveLength(0);
  });

  it("matches multiple emails", () => {
    const text = "admin@corp.com, manager@corp.co.kr";
    const matches = matchAll(pattern, text);
    expect(matches).toEqual(["admin@corp.com", "manager@corp.co.kr"]);
  });
});

// ── PII_ACCOUNT ─────────────────────────────────────────────────

describe("PII_ACCOUNT pattern", () => {
  const pattern = getPattern("PII_ACCOUNT");

  it("matches a typical bank account number (3-2-6)", () => {
    const matches = matchAll(pattern, "110-12-123456");
    expect(matches).toEqual(["110-12-123456"]);
  });

  it("matches a 4-4-4 format", () => {
    const matches = matchAll(pattern, "1234-5678-9012");
    expect(matches).toEqual(["1234-5678-9012"]);
  });

  it("matches a 6-6-6 format (max lengths)", () => {
    const matches = matchAll(pattern, "123456-123456-123456");
    expect(matches).toEqual(["123456-123456-123456"]);
  });

  it("matches a 3-2-4 format (min lengths)", () => {
    const matches = matchAll(pattern, "123-12-1234");
    expect(matches).toEqual(["123-12-1234"]);
  });

  it("does not match two-digit first segment", () => {
    const matches = matchAll(pattern, "12-12-1234");
    expect(matches).toHaveLength(0);
  });

  it("does not match single-digit middle segment", () => {
    const matches = matchAll(pattern, "123-1-1234");
    expect(matches).toHaveLength(0);
  });
});

// ── Pattern ordering ────────────────────────────────────────────

describe("PII_PATTERNS ordering", () => {
  it("has SSN pattern before CORP_ID", () => {
    const ssnIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_SSN");
    const corpIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_CORP_ID");
    expect(ssnIdx).toBeLessThan(corpIdx);
  });

  it("has CARD pattern before ACCOUNT to avoid partial card matches", () => {
    const cardIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_CARD");
    const accountIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_ACCOUNT");
    expect(cardIdx).toBeLessThan(accountIdx);
  });

  it("has SSN and CORP_ID before ACCOUNT", () => {
    const ssnIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_SSN");
    const corpIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_CORP_ID");
    const accountIdx = PII_PATTERNS.findIndex((p) => p.entityType === "PII_ACCOUNT");
    expect(ssnIdx).toBeLessThan(accountIdx);
    expect(corpIdx).toBeLessThan(accountIdx);
  });

  it("contains exactly 6 patterns", () => {
    expect(PII_PATTERNS).toHaveLength(6);
  });

  it("all patterns use global flag", () => {
    for (const pattern of PII_PATTERNS) {
      expect(pattern.regex.flags).toContain("g");
    }
  });
});
