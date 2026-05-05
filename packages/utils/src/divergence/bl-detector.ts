/**
 * F426 (Sprint 259) — BL-level DIVERGENCE 자동 검출 (TS AST 기반).
 *
 * Sprint 258 AIF-ANLS-056 자동화 분류 결과:
 *   - BL-028 (exclusion hardcoded 0)        — 95% 신뢰도 (정확 매칭)
 *   - BL-027 (under-implemented function)   — 70% 신뢰도 (heuristic)
 *
 * 본 모듈은 위 2종 패턴을 typescript Compiler API로 검출한다.
 * F354 (Sprint 218) 수동 markers와 구분하기 위해 모든 결과에 `autoDetected: true` 명시.
 */
import * as ts from "typescript";
import type { BLDivergenceMarker } from "@ai-foundry/types";

const BL028_NAME_PATTERN = /exclusion|excl_amount|exemptAmount/i;

/**
 * BL-028 — `exclusion*` / `excl_amount` / `exemptAmount` 변수가 literal `0`으로 초기화/할당되는 패턴 검출.
 *
 * Positive 매칭 (legacy):
 *   const exclusionAmount = 0;
 *   let excl_amount = 0;
 *   exclusionAmount = 0;
 *
 * Negative 매칭 (current):
 *   const exclusionAmount = Math.round(voucher.cashback_amount * 1.1);
 *   const value = 0;  // 이름 미매칭
 */
export function detectHardCodedExclusion(
  sourceFile: ts.SourceFile,
  fileName: string,
): BLDivergenceMarker[] {
  const markers: BLDivergenceMarker[] = [];

  function pushMarker(name: string, line: number): void {
    markers.push({
      ruleId: "BL-028",
      severity: "MEDIUM",
      pattern: "hardcoded_exclusion",
      sourceFile: fileName,
      sourceLine: line,
      detail: `${name} hardcoded to 0 — spec defines exclusion calculation formula (cashback*1.1 etc.)`,
      matchedText: `${name} = 0`,
      confidence: 0.95,
      autoDetected: true,
    });
  }

  function visit(node: ts.Node): void {
    // case A: const/let/var X = 0
    if (ts.isVariableDeclaration(node)) {
      const name = node.name.getText(sourceFile);
      const init = node.initializer;
      if (
        BL028_NAME_PATTERN.test(name) &&
        init &&
        ts.isNumericLiteral(init) &&
        init.text === "0"
      ) {
        const lineCol = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        pushMarker(name, lineCol.line + 1);
      }
    }

    // case B: X = 0 (assignment expression)
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = node.left.getText(sourceFile);
      const right = node.right;
      if (
        BL028_NAME_PATTERN.test(left) &&
        ts.isNumericLiteral(right) &&
        right.text === "0"
      ) {
        const lineCol = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        pushMarker(left, lineCol.line + 1);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return markers;
}

export interface DetectUnderImplementationOptions {
  targetFunctionNames?: string[];
  minBodyLines?: number;
  minBranchDepth?: number;
}

/**
 * BL-027 — under-implemented function heuristic.
 *
 * 검출 조건 (AND):
 *   - body line count < minBodyLines (default 10)
 *   - branch depth < minBranchDepth (default 2; if/switch/try-catch 중첩 깊이)
 *
 * Positive 매칭 (legacy stub):
 *   function approveRefund() { return { status: "approved" }; }
 *
 * Negative 매칭 (current):
 *   async function approveRefund(...) { /* 50+ lines, 3+ branches *\/ }
 *
 * 신뢰도 70% — heuristic이라 false positive 가능. targetFunctionNames로 범위 한정 시 정확도 향상.
 */
export function detectUnderImplementation(
  sourceFile: ts.SourceFile,
  fileName: string,
  options: DetectUnderImplementationOptions = {},
): BLDivergenceMarker[] {
  const markers: BLDivergenceMarker[] = [];
  const minLines = options.minBodyLines ?? 10;
  const minDepth = options.minBranchDepth ?? 2;
  const targetNames = options.targetFunctionNames;

  function countBranchDepth(body: ts.Node): number {
    let maxDepth = 0;
    function inner(node: ts.Node, depth: number): void {
      let nextDepth = depth;
      if (
        ts.isIfStatement(node) ||
        ts.isSwitchStatement(node) ||
        ts.isTryStatement(node)
      ) {
        nextDepth = depth + 1;
      }
      if (nextDepth > maxDepth) maxDepth = nextDepth;
      ts.forEachChild(node, (c) => inner(c, nextDepth));
    }
    inner(body, 0);
    return maxDepth;
  }

  function emitIfMatched(
    funcName: string,
    body: ts.Block,
    nodeStart: ts.Node,
  ): void {
    if (targetNames && !targetNames.includes(funcName)) return;

    const start = sourceFile.getLineAndCharacterOfPosition(body.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(body.getEnd());
    const bodyLines = end.line - start.line;
    const branchDepth = countBranchDepth(body);

    if (bodyLines < minLines && branchDepth < minDepth) {
      const declStart = sourceFile.getLineAndCharacterOfPosition(nodeStart.getStart());
      markers.push({
        ruleId: "BL-027",
        severity: "LOW",
        pattern: "under_implementation",
        sourceFile: fileName,
        sourceLine: declStart.line + 1,
        detail: `Function '${funcName}': bodyLines=${bodyLines} (<${minLines}) + branchDepth=${branchDepth} (<${minDepth}). Likely under-implemented.`,
        matchedText: funcName,
        confidence: 0.7,
        autoDetected: true,
      });
    }
  }

  function visit(node: ts.Node): void {
    // FunctionDeclaration
    if (ts.isFunctionDeclaration(node) && node.body && node.name) {
      emitIfMatched(node.name.getText(sourceFile), node.body, node);
    }

    // VariableDeclaration with FunctionExpression / ArrowFunction
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = node.initializer;
      if (
        (ts.isFunctionExpression(init) || ts.isArrowFunction(init)) &&
        init.body &&
        ts.isBlock(init.body)
      ) {
        emitIfMatched(node.name.getText(sourceFile), init.body, node);
      }
    }

    // MethodDeclaration
    if (ts.isMethodDeclaration(node) && node.body) {
      emitIfMatched(node.name.getText(sourceFile), node.body, node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return markers;
}

/**
 * 텍스트 → ts.SourceFile 변환 (in-memory parse, no fs).
 */
export function parseTypeScriptSource(
  fileName: string,
  sourceText: string,
): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
}
