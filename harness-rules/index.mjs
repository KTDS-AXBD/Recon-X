/**
 * @axbd/harness-kit ESLint Plugin
 * 3 custom rules extracted from Foundry-X (Phase 5+)
 *
 * Usage in eslint.config.js:
 *   import { harnessPlugin } from '@axbd/harness-kit/rules';
 *   plugins: { 'harness': harnessPlugin }
 */

import { noDirectDbInRoute } from "./no-direct-db-in-route.mjs";
import { requireZodSchema } from "./require-zod-schema.mjs";
import { noOrphanPlumbImport } from "./no-orphan-plumb-import.mjs";

export const harnessPlugin = {
  meta: { name: "eslint-plugin-harness", version: "0.1.0" },
  rules: {
    "no-direct-db-in-route": noDirectDbInRoute,
    "require-zod-schema": requireZodSchema,
    "no-orphan-plumb-import": noOrphanPlumbImport,
  },
};
