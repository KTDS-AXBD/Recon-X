/**
 * ESLint Flat Config Template — @axbd/harness-kit
 *
 * 사용법:
 *   1. 이 파일을 프로젝트 루트 또는 패키지 루트에 eslint.config.js로 복사
 *   2. import 경로를 실제 harness-kit 위치에 맞게 수정
 *   3. files 패턴과 rules 활성화를 프로젝트에 맞게 조정
 *
 * 커스터마이징 포인트는 [CUSTOMIZE] 주석으로 표시
 */
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
// [CUSTOMIZE] harness-kit 플러그인 import 경로
import { harnessPlugin } from "@axbd/harness-kit/rules";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // [CUSTOMIZE] 대상 파일 패턴
    files: ["src/**/*.{ts,tsx}"],
    plugins: { harness: harnessPlugin },
    rules: {
      // --- TypeScript 기본 ---
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "error",

      // --- Harness 커스텀 룰 ---
      // [CUSTOMIZE] 프로젝트에 맞게 활성화/비활성화
      "harness/no-direct-db-in-route": "error", // Route에서 D1 직접 접근 차단
      "harness/require-zod-schema": "warn", // Zod 스키마 검증 강제
      "harness/no-orphan-plumb-import": "off", // 제한 모듈 import 차단 (Recon-X에서 비활성화)
    },
  },
  {
    // [CUSTOMIZE] 무시 패턴
    ignores: ["dist/", "node_modules/", "**/*.test.ts"],
  },
);
