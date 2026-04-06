/**
 * ESLint Rule: require-zod-schema
 * Route에서 c.req.json()을 호출할 때 반드시 Zod schema.parse()로 감싸도록 강제합니다.
 *
 * OK:  const body = schema.parse(await c.req.json());
 * NG:  const body = await c.req.json();  // 미검증
 *
 * Origin: Foundry-X packages/cli/src/harness/lint-rules/
 */
export const requireZodSchema = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require Zod schema validation for request body parsing in routes",
    },
    hasSuggestions: true,
    messages: {
      requireZod: "Use Zod schema to validate request body: `schema.parse(await c.req.json())`",
      addZodParse: "Wrap with schema.parse()",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (!filename.includes("/routes/")) return {};

    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "json" &&
          node.callee.object.type === "MemberExpression" &&
          node.callee.object.property.type === "Identifier" &&
          node.callee.object.property.name === "req"
        ) {
          const parent = node.parent;
          if (
            parent?.type === "CallExpression" &&
            parent.callee?.type === "MemberExpression" &&
            parent.callee.property?.name === "parse"
          ) {
            return;
          }

          context.report({
            node,
            messageId: "requireZod",
            suggest: [{
              messageId: "addZodParse",
              fix(fixer) {
                const text = context.sourceCode.getText(node);
                return fixer.replaceText(node, `schema.parse(${text})`);
              },
            }],
          });
        }
      },
    };
  },
};
