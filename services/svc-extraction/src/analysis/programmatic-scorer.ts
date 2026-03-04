/**
 * 프로그래밍 기반 스코어러 — LLM 없이 extraction 결과를 통계적으로 스코어링
 *
 * 기존 LLM(Pass 1)이 수행하던 4가지 점수 계산을 순수 함수로 대체한다:
 * - frequencyScore: 프로세스가 rules/relationships/다른 processes에서 참조되는 빈도
 * - dependencyScore: relationships에서 의존 대상(to)으로 참조되는 빈도
 * - domainRelevanceScore: 퇴직연금 도메인 키워드 매칭
 * - dataFlowCentrality: from/to로 연결된 고유 entity 수
 *
 * 출력은 기존 ScoringOutput과 동일한 형식이므로 D1 INSERT 로직을 그대로 재사용 가능.
 */

import type { ScoredProcess, CoreJudgment, ProcessTreeNode } from "@ai-foundry/types";

/** 프로그래밍 스코어러 출력 — processTree는 ProcessTreeNode[] */
export interface ProgrammaticScoringOutput {
  scoredProcesses: ScoredProcess[];
  coreJudgments: CoreJudgment[];
  processTree: ProcessTreeNode[];
}

// ── 입력 타입 ───────────────────────────────────────────────────────────

export interface ExtractionInput {
  processes: Array<{ name: string; description: string; steps: string[] }>;
  entities: Array<{ name: string; type: string; attributes: string[] }>;
  rules: Array<{ condition: string; outcome: string }>;
  relationships: Array<{ from: string; to: string; type: string }>;
}

// ── 도메인 키워드 사전 ──────────────────────────────────────────────────

const DOMAIN_KEYWORDS = [
  "중도인출", "가입", "수급", "운용", "퇴직급여", "적립금",
  "DC", "DB", "IRP", "확정급여", "확정기여", "퇴직연금",
  "사전지정운용", "디폴트옵션", "지급", "이전", "해지",
  "사업장", "가입자", "수급권", "부담금", "적립비율",
  "연금", "일시금", "퇴직", "운용관리", "자산관리",
  "퇴직급여보장법", "근로자퇴직", "퇴직연금사업자",
  "원리금보장", "실적배당", "위험자산", "안전자산",
  "연금저축", "세제혜택", "이연퇴직소득세",
];

// ── 유틸리티 ────────────────────────────────────────────────────────────

/** 텍스트 내 프로세스명 출현 여부 확인 (부분 매칭) */
function textContainsProcess(text: string, processName: string): boolean {
  return text.includes(processName);
}

/** 프로세스 관련 전체 텍스트 결합 */
function getProcessText(proc: { name: string; description: string; steps: string[] }): string {
  return `${proc.name} ${proc.description} ${proc.steps.join(" ")}`;
}

// ── 스코어 계산 ─────────────────────────────────────────────────────────

function computeFrequencyScore(
  processName: string,
  input: ExtractionInput
): { score: number; count: number } {
  let count = 0;
  const total =
    input.rules.length * 2 + // condition + outcome
    input.relationships.length * 2 + // from + to
    (input.processes.length - 1); // 다른 프로세스의 steps

  for (const rule of input.rules) {
    if (textContainsProcess(rule.condition, processName)) count++;
    if (textContainsProcess(rule.outcome, processName)) count++;
  }
  for (const rel of input.relationships) {
    if (textContainsProcess(rel.from, processName)) count++;
    if (textContainsProcess(rel.to, processName)) count++;
  }
  for (const proc of input.processes) {
    if (proc.name === processName) continue;
    if (proc.steps.some((s) => textContainsProcess(s, processName))) count++;
  }

  const score = total > 0 ? Math.min(count / Math.max(total * 0.1, 1), 1) : 0;
  return { score, count };
}

function computeDependencyScore(
  processName: string,
  input: ExtractionInput
): { score: number; count: number } {
  let count = 0;
  for (const rel of input.relationships) {
    if (textContainsProcess(rel.to, processName)) count++;
  }

  // max로 정규화: 가장 많이 의존되는 프로세스 기준
  const maxDeps = Math.max(
    ...input.processes.map((p) =>
      input.relationships.filter((r) => textContainsProcess(r.to, p.name)).length
    ),
    1
  );

  return { score: Math.min(count / maxDeps, 1), count };
}

function computeDomainRelevanceScore(
  proc: { name: string; description: string; steps: string[] }
): { score: number; matchedKeywords: string[] } {
  const text = getProcessText(proc);
  const matched: string[] = [];

  for (const kw of DOMAIN_KEYWORDS) {
    if (text.includes(kw)) matched.push(kw);
  }

  // 매칭 키워드 수 기반 정규화 (5개 이상이면 만점)
  const score = Math.min(matched.length / 5, 1);
  return { score, matchedKeywords: matched };
}

function computeDataFlowCentrality(
  processName: string,
  input: ExtractionInput
): { score: number; connectedEntities: number } {
  const connected = new Set<string>();

  for (const rel of input.relationships) {
    if (textContainsProcess(rel.from, processName)) connected.add(rel.to);
    if (textContainsProcess(rel.to, processName)) connected.add(rel.from);
  }

  const maxConnected = Math.max(
    ...input.processes.map((p) => {
      const s = new Set<string>();
      for (const r of input.relationships) {
        if (textContainsProcess(r.from, p.name)) s.add(r.to);
        if (textContainsProcess(r.to, p.name)) s.add(r.from);
      }
      return s.size;
    }),
    1
  );

  return {
    score: Math.min(connected.size / maxConnected, 1),
    connectedEntities: connected.size,
  };
}

// ── 카테고리 분류 ───────────────────────────────────────────────────────

function categorize(importanceScore: number): ScoredProcess["category"] {
  if (importanceScore >= 0.8) return "mega";
  if (importanceScore >= 0.6) return "core";
  if (importanceScore >= 0.3) return "supporting";
  return "peripheral";
}

// ── processTree 구성 ────────────────────────────────────────────────────

function buildProcessTree(scoredProcesses: ScoredProcess[]): ProcessTreeNode[] {
  const mega = scoredProcesses.filter((p) => p.category === "mega");
  const core = scoredProcesses.filter((p) => p.category === "core");
  const supporting = scoredProcesses.filter((p) => p.category === "supporting");
  const peripheral = scoredProcesses.filter((p) => p.category === "peripheral");

  function toNode(proc: ScoredProcess, children: ProcessTreeNode[]): ProcessTreeNode {
    return {
      name: proc.name,
      type: proc.category,
      children,
      methods: proc.steps.map((s) => ({ name: s, triggerCondition: "" })),
      actors: [],
      dataInputs: [],
      dataOutputs: [],
    };
  }

  // mega가 없으면 core를 최상위로
  if (mega.length === 0) {
    if (core.length === 0) {
      // supporting만 있는 경우
      return supporting.map((p) => toNode(p, []));
    }
    return core.map((p) =>
      toNode(p, supporting.map((s) => toNode(s, [])))
    );
  }

  // mega → core/supporting 하위 배치, peripheral은 별도
  const coreNodes = core.map((p) =>
    toNode(p, supporting.map((s) => toNode(s, [])))
  );

  const megaNodes = mega.map((p) => toNode(p, coreNodes));

  // peripheral은 최상위에 별도 추가
  const peripheralNodes = peripheral.map((p) => toNode(p, []));

  return [...megaNodes, ...peripheralNodes];
}

// ── 메인 함수 ───────────────────────────────────────────────────────────

export function scoreProgrammatically(input: ExtractionInput): ProgrammaticScoringOutput {
  const scoredProcesses: ScoredProcess[] = [];
  const coreJudgments: CoreJudgment[] = [];

  for (const proc of input.processes) {
    const freq = computeFrequencyScore(proc.name, input);
    const dep = computeDependencyScore(proc.name, input);
    const domain = computeDomainRelevanceScore(proc);
    const flow = computeDataFlowCentrality(proc.name, input);

    // 가중 평균 (domain 비중 높게)
    const importanceScore = Math.round(
      (freq.score * 0.2 + dep.score * 0.2 + domain.score * 0.35 + flow.score * 0.25) * 100
    ) / 100;

    const category = categorize(importanceScore);
    const isCore = importanceScore >= 0.7 || domain.score >= 0.8;

    const keywordStr = domain.matchedKeywords.length > 0
      ? domain.matchedKeywords.slice(0, 5).join(", ")
      : "없음";

    const reasoning = `참조 ${freq.count}회, 의존도 ${dep.count}건, 도메인 연관: ${keywordStr}, 데이터 연결: ${flow.connectedEntities}개 엔티티`;

    scoredProcesses.push({
      name: proc.name,
      description: proc.description,
      steps: proc.steps,
      importanceScore,
      importanceReason: reasoning,
      referenceCount: freq.count,
      dependencyCount: dep.count,
      isCore,
      category,
    });

    coreJudgments.push({
      processName: proc.name,
      isCore,
      score: importanceScore,
      factors: {
        frequencyScore: Math.round(freq.score * 100) / 100,
        dependencyScore: Math.round(dep.score * 100) / 100,
        domainRelevanceScore: Math.round(domain.score * 100) / 100,
        dataFlowCentrality: Math.round(flow.score * 100) / 100,
      },
      reasoning,
    });
  }

  const processTree = buildProcessTree(scoredProcesses);

  return { scoredProcesses, coreJudgments, processTree };
}
