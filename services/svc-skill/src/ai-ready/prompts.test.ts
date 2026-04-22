import { describe, it, expect } from "vitest";
import { buildPrompt, buildSystemPrompt } from "./prompts.js";
import type { PromptInput } from "./prompts.js";
import { ALL_AI_READY_CRITERIA } from "@ai-foundry/types";

const SAMPLE_INPUT: PromptInput = {
  skillName: "lpon-charge",
  specContent: {
    provenanceYaml: `skillId: POL-LPON-CHARGE-001
sources:
  - type: reverse-engineering
    businessRules: [BL-001, BL-002, BL-003]
    confidence: 0.92
inputCompleteness:
  rulesCoverage: 0.92
  testCoverage: 0.78`,
    rules: [
      `# ES-CHARGE-001: 충전 멱등성 규칙
### condition
동일 chargeRequestId로 2회 이상 수신.
### criteria
charge_transactions에 동일 chargeRequestId + status completed.
### outcome
기존 트랜잭션 결과 반환, 신규 출금 발생 없음.
### exception
status=failed이면 신규 처리.`,
    ],
    runbooks: [
      `# ES-CHARGE-001: 충전 멱등성 — 운영 가이드
이중 충전 발생 시 charge_transactions에서 동일 chargeRequestId 건 조회 후
후발 건 취소 처리. POST /money/chargeCancel 호출.`,
    ],
    tests: [
      `emptySlotId: ES-CHARGE-001
scenarios:
  - id: TC-IDEM-001
    name: 동일 requestId 재전송 시 기존 completed 결과 반환
    given:
      chargeRequestId: "req-abc-001"
      existingStatus: "completed"
    when: charge_requested_again
    then:
      - responseStatus: 200
      - responseIdempotent: true`,
    ],
    contractYaml: `skillId: POL-LPON-CHARGE-001
scenarios:
  - id: TC-CHARGE-001
    name: 잔액 충분 시 충전 성공
    given:
      withdrawalAccountBalance: 100000
      chargeAmount: 50000
    when: charge_requested
    then:
      - charge_completed: true`,
  },
};

// ── 6기준 프롬프트 빌드 ────────────────────────────────────────────────

describe("buildPrompt — 6기준 전체", () => {
  it("모든 기준에 대해 프롬프트 생성 성공", () => {
    for (const criterion of ALL_AI_READY_CRITERIA) {
      const prompt = buildPrompt(criterion, SAMPLE_INPUT);
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(100);
    }
  });

  it("skill 이름 포함 확인", () => {
    const prompt = buildPrompt("source_consistency", SAMPLE_INPUT);
    expect(prompt).toContain("lpon-charge");
  });

  it("spec 컨텐츠 포함 확인 (rules)", () => {
    const prompt = buildPrompt("io_structure", SAMPLE_INPUT);
    expect(prompt).toContain("ES-CHARGE-001");
  });

  it("JSON 출력 지시 포함", () => {
    const prompt = buildPrompt("exception_handling", SAMPLE_INPUT);
    expect(prompt).toContain('"score"');
    expect(prompt).toContain('"rationale"');
  });

  it("기준별 한국어 이름 포함", () => {
    const criterionMap: Array<[Parameters<typeof buildPrompt>[0], string]> = [
      ["source_consistency", "소스코드 정합성"],
      ["comment_doc_alignment", "주석·문서 일치"],
      ["io_structure", "입출력 구조 명확성"],
      ["exception_handling", "예외·에러 핸들링"],
      ["srp_reusability", "업무루틴 분리·재사용성"],
      ["testability", "테스트 가능성"],
    ];
    for (const [criterion, expectedKorean] of criterionMap) {
      const prompt = buildPrompt(criterion, SAMPLE_INPUT);
      expect(prompt).toContain(expectedKorean);
    }
  });
});

// ── 시스템 프롬프트 ────────────────────────────────────────────────────

describe("buildSystemPrompt", () => {
  it("JSON 전용 출력 지시 포함", () => {
    const sys = buildSystemPrompt();
    expect(sys).toContain("JSON만 반환");
  });
});
