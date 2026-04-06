/**
 * ESLint Rule: no-orphan-plumb-import
 * PlumbBridge import을 CLI 패키지 외부에서 금지합니다.
 * API/Web 등에서 Plumb를 직접 import하면 subprocess 의존성이 전파되므로,
 * MCP 또는 CLI subprocess로 접근해야 합니다.
 *
 * 커스터마이징: "plumb" 키워드를 서비스 특화 모듈로 변경하여 재사용 가능
 * 예: "plumb" → "internal-only-module" 등
 *
 * Origin: Foundry-X packages/cli/src/harness/lint-rules/
 */
export const noOrphanPlumbImport = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow restricted module import outside of designated package",
    },
    hasSuggestions: true,
    messages: {
      noOrphanImport: "This module should only be imported within its designated package. Use MCP or service API instead.",
      useMcp: "Use MCP tool call or API endpoint for cross-package integration.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    // CLI 패키지 내부는 허용 (커스터마이징 포인트: 패키지 경로)
    if (filename.includes("packages/cli/")) return {};

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === "string" && (
          source.includes("plumb") ||
          source.includes("PlumbBridge")
        )) {
          context.report({
            node,
            messageId: "noOrphanImport",
            suggest: [{
              messageId: "useMcp",
              fix(fixer) {
                return fixer.replaceText(node, `/* TODO: use MCP instead */ ${context.sourceCode.getText(node)}`);
              },
            }],
          });
        }
      },
    };
  },
};
