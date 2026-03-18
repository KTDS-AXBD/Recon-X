import type { AmbiguityResult } from "@ai-foundry/types";

// ── Keyword / Pattern Lists ─────────────────────────────────────────

const GOAL_KEYWORDS = [
  "목적", "목표", "개요", "배경",
  "purpose", "objective", "goal", "overview",
];

const CONSTRAINT_PATTERNS = [
  /\bif\b/i,
  /\bwhen\b/i,
  /인\s*경우/,
  /할\s*때/,
  /하면/,
  /조건/,
  /제약/,
  /기준/,
];

const QUANT_PATTERN = /\d+\s*(일|%|원|건|시간|개|명|회|차|개월|년)/g;
const COMPARISON_KEYWORDS = ["이상", "이하", "초과", "미만"];

// ── Weights ─────────────────────────────────────────────────────────

const WEIGHT_GOAL = 0.4;
const WEIGHT_CONSTRAINT = 0.3;
const WEIGHT_CRITERIA = 0.3;

const AMBIGUITY_THRESHOLD = 0.2;

// ── AmbiguityScorer ─────────────────────────────────────────────────

export class AmbiguityScorer {
  /**
   * Rule-based ambiguity scoring for parsed document chunks.
   * No LLM calls — purely keyword/pattern counting.
   *
   * Formula: ambiguity = 1 - Σ(clarity_dimension × weight)
   *
   * Dimensions:
   *  - Goal Clarity (40%): keyword density for purpose/objective terms
   *  - Constraint Clarity (30%): conditional pattern frequency
   *  - Success Criteria (30%): quantitative value + comparison keyword frequency
   */
  score(chunks: Array<{ text: string }>): AmbiguityResult {
    const fullText = chunks.map((c) => c.text).join(" ");

    const goalClarity = this.measureGoalClarity(fullText);
    const constraintClarity = this.measureConstraintClarity(fullText);
    const successCriteria = this.measureSuccessCriteria(fullText);

    const clarity =
      goalClarity * WEIGHT_GOAL +
      constraintClarity * WEIGHT_CONSTRAINT +
      successCriteria * WEIGHT_CRITERIA;

    const ambiguityScore = parseFloat((1 - clarity).toFixed(4));
    const rejected = ambiguityScore > AMBIGUITY_THRESHOLD;

    const feedback: string[] = [];
    if (rejected) {
      if (goalClarity < 0.5) {
        feedback.push(
          "Goal Clarity 부족: 문서에 목적/목표/배경/개요를 명시하세요 (purpose, objective, goal, overview)",
        );
      }
      if (constraintClarity < 0.5) {
        feedback.push(
          "Constraint Clarity 부족: 조건/제약/기준을 구체적으로 기술하세요 (IF, WHEN, ~인 경우, ~할 때)",
        );
      }
      if (successCriteria < 0.5) {
        feedback.push(
          "Success Criteria 부족: 정량적 기준(숫자+단위: 일, %, 원, 건)을 포함하세요",
        );
      }
    }

    return {
      ambiguityScore,
      dimensions: {
        goalClarity,
        constraintClarity,
        successCriteria,
      },
      rejected,
      feedback,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────

  private measureGoalClarity(text: string): number {
    const lower = text.toLowerCase();
    let count = 0;
    for (const kw of GOAL_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) {
        count++;
      }
    }
    return Math.min(1.0, count / 5);
  }

  private measureConstraintClarity(text: string): number {
    let count = 0;
    for (const pat of CONSTRAINT_PATTERNS) {
      const matches = text.match(new RegExp(pat.source, pat.flags + "g"));
      count += matches?.length ?? 0;
    }
    return Math.min(1.0, count / 8);
  }

  private measureSuccessCriteria(text: string): number {
    const quantMatches = text.match(QUANT_PATTERN);
    let count = quantMatches?.length ?? 0;

    for (const kw of COMPARISON_KEYWORDS) {
      if (text.includes(kw)) {
        count++;
      }
    }
    return Math.min(1.0, count / 5);
  }
}
