/**
 * ESLint Rule: no-direct-db-in-route
 * Route handler에서 D1 직접 접근을 금지하고 Service 레이어를 강제합니다.
 *
 * 감지 패턴:
 *   - c.env.DB (Hono context에서 D1 바인딩 직접 접근)
 *   - db.prepare() (D1 prepared statement 직접 호출)
 *
 * Origin: Foundry-X packages/cli/src/harness/lint-rules/
 */
export const noDirectDbInRoute = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct D1 database access in route handlers — use service layer",
    },
    hasSuggestions: true,
    messages: {
      noDirectDb: "Route handler should not access D1 directly. Use a service method instead.",
      useService: "Extract database call to a service method.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes("/routes/")) return {};

    return {
      MemberExpression(node) {
        if (
          node.object.type === "MemberExpression" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env" &&
          node.property.type === "Identifier" &&
          node.property.name === "DB"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `/* TODO: use service */ ${text}`);
              },
            }],
          });
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "prepare"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `/* TODO: use service */ ${text}`);
              },
            }],
          });
        }
      },
    };
  },
};
