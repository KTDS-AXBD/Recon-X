/**
 * 프로그래밍 기반 진단 — LLM 없이 규칙 기반으로 4대 진단 소견 생성
 *
 * 4가지 규칙:
 * - missing:        relationships에서 참조하는 entity가 entities[]에 없음
 * - duplicate:      processes[] 내 이름 유사도(단어 겹침 비율) > 0.7
 * - overspec:       importanceScore < 0.2인데 steps.length > 5
 * - inconsistency:  rules[]의 condition이 참조하는 프로세스가 processes[]에 없음
 *
 * 출력은 DiagnosisFinding[] 형식 — D1 INSERT 로직 재사용 가능.
 */

import type { DiagnosisFinding, ScoredProcess } from "@ai-foundry/types";
import type { ExtractionInput } from "./programmatic-scorer.js";

// ── 유틸리티 ────────────────────────────────────────────────────────────

/** 한국어/영어 단어 분리 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .replace(/[^\w가-힣]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

/** Jaccard 유사도 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ── 진단 규칙 ───────────────────────────────────────────────────────────

function detectMissing(input: ExtractionInput): DiagnosisFinding[] {
  const findings: DiagnosisFinding[] = [];
  const entityNames = new Set(input.entities.map((e) => e.name));

  for (const rel of input.relationships) {
    // from 또는 to가 entities에 없으면 누락 판정
    const missingNames: string[] = [];
    if (!entityNames.has(rel.from) && !input.processes.some((p) => p.name === rel.from)) {
      missingNames.push(rel.from);
    }
    if (!entityNames.has(rel.to) && !input.processes.some((p) => p.name === rel.to)) {
      missingNames.push(rel.to);
    }

    for (const name of missingNames) {
      // 중복 소견 방지
      if (findings.some((f) => f.finding.includes(name))) continue;

      findings.push({
        findingId: crypto.randomUUID(),
        type: "missing",
        severity: "warning",
        finding: `관계(${rel.type})에서 참조하는 '${name}'이(가) 엔티티/프로세스 목록에 정의되어 있지 않습니다.`,
        evidence: `relationship: ${rel.from} → ${rel.to} (type: ${rel.type})`,
        recommendation: `'${name}'을(를) 엔티티 또는 프로세스로 명시적으로 정의하세요.`,
        sourceDocumentIds: [],
        relatedProcesses: [rel.from, rel.to].filter((n) => input.processes.some((p) => p.name === n)),
        confidence: 0.75,
        hitlStatus: "pending",
      });
    }
  }

  return findings;
}

function detectDuplicate(input: ExtractionInput): DiagnosisFinding[] {
  const findings: DiagnosisFinding[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < input.processes.length; i++) {
    const procA = input.processes[i];
    if (!procA) continue;
    const tokensA = tokenize(procA.name);

    for (let j = i + 1; j < input.processes.length; j++) {
      const procB = input.processes[j];
      if (!procB) continue;

      const key = `${procA.name}||${procB.name}`;
      if (checked.has(key)) continue;
      checked.add(key);

      const tokensB = tokenize(procB.name);
      const sim = jaccardSimilarity(tokensA, tokensB);

      if (sim > 0.7) {
        findings.push({
          findingId: crypto.randomUUID(),
          type: "duplicate",
          severity: "info",
          finding: `프로세스 '${procA.name}'과(와) '${procB.name}'이(가) 유사합니다 (유사도: ${Math.round(sim * 100)}%).`,
          evidence: `단어 겹침 비율 ${Math.round(sim * 100)}% — 동일/유사 업무가 다른 이름으로 정의되었을 가능성.`,
          recommendation: `두 프로세스가 동일 업무인지 확인하고, 중복이면 하나로 통합하세요.`,
          sourceDocumentIds: [],
          relatedProcesses: [procA.name, procB.name],
          confidence: Math.round(sim * 100) / 100,
          hitlStatus: "pending",
        });
      }
    }
  }

  return findings;
}

function detectOverspec(scoredProcesses: ScoredProcess[]): DiagnosisFinding[] {
  const findings: DiagnosisFinding[] = [];

  for (const proc of scoredProcesses) {
    if (proc.importanceScore < 0.2 && proc.steps.length > 5) {
      findings.push({
        findingId: crypto.randomUUID(),
        type: "overspec",
        severity: "info",
        finding: `프로세스 '${proc.name}'의 중요도가 낮지만(${proc.importanceScore}) 단계가 ${proc.steps.length}개로 과도합니다.`,
        evidence: `importanceScore=${proc.importanceScore}, steps=${proc.steps.length}개. 카테고리: ${proc.category}.`,
        recommendation: `이 프로세스가 실제로 필요한지 검토하고, 불필요하면 제거하거나 단순화하세요.`,
        sourceDocumentIds: [],
        relatedProcesses: [proc.name],
        confidence: 0.65,
        hitlStatus: "pending",
      });
    }
  }

  return findings;
}

function detectInconsistency(input: ExtractionInput): DiagnosisFinding[] {
  const findings: DiagnosisFinding[] = [];
  const processNames = new Set(input.processes.map((p) => p.name));

  for (const rule of input.rules) {
    // condition에서 프로세스명을 참조하는데 processes[]에 없는 경우
    for (const proc of input.processes) {
      // 역방향: rule.condition이 프로세스를 참조하는지 확인
      if (rule.condition.includes(proc.name)) {
        // 이 프로세스는 존재하므로 OK
      }
    }

    // condition 내 한국어 명사구가 프로세스에 없는 경우 탐지
    // 간단한 휴리스틱: "XXX 시" 또는 "XXX 경우" 패턴에서 XXX가 프로세스명과 매칭 안 되면
    const conditionRefs = rule.condition.match(/([가-힣]+(?:\s[가-힣]+)?)\s(?:시|경우|때|후|전)/g);
    if (conditionRefs) {
      for (const ref of conditionRefs) {
        const cleaned = ref.replace(/\s(?:시|경우|때|후|전)$/, "").trim();
        if (cleaned.length < 2) continue;

        // 프로세스명에 포함되어 있는지 확인
        const hasMatch = [...processNames].some((pn) => pn.includes(cleaned) || cleaned.includes(pn));
        if (!hasMatch) {
          // 중복 방지
          if (findings.some((f) => f.finding.includes(cleaned))) continue;

          findings.push({
            findingId: crypto.randomUUID(),
            type: "inconsistency",
            severity: "warning",
            finding: `규칙 조건에서 참조하는 '${cleaned}'에 대응하는 프로세스가 정의되어 있지 않습니다.`,
            evidence: `rule condition: "${rule.condition}" → outcome: "${rule.outcome}"`,
            recommendation: `'${cleaned}' 관련 프로세스를 추출 데이터에 추가하거나, 규칙 조건을 정의된 프로세스명으로 수정하세요.`,
            sourceDocumentIds: [],
            relatedProcesses: [],
            confidence: 0.6,
            hitlStatus: "pending",
          });
        }
      }
    }
  }

  return findings;
}

// ── 메인 함수 ───────────────────────────────────────────────────────────

export function diagnoseProgrammatically(
  scoredProcesses: ScoredProcess[],
  input: ExtractionInput
): DiagnosisFinding[] {
  const all: DiagnosisFinding[] = [
    ...detectMissing(input),
    ...detectDuplicate(input),
    ...detectOverspec(scoredProcesses),
    ...detectInconsistency(input),
  ];

  // severity 순서 정렬: critical > warning > info
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  all.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  return all;
}
