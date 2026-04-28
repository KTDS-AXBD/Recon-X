// F401 (TD-41): test.describe.skip 해제
// /poc/ai-ready → archived, redirects to /executive/overview (F377)
// /org-spec → still active route
import { test, expect } from "@playwright/test";

test.describe("PoC & Spec pages (Sprint 209~210)", () => {
  // /poc/ai-ready → Navigate to /executive/overview (F377 archive)
  test("poc/ai-ready redirects to executive overview", async ({ page }) => {
    await page.goto("/poc/ai-ready");
    await expect(page).toHaveURL(/\/executive\/overview/);
  });

  test("poc/ai-ready drill-down redirects to executive overview", async ({ page }) => {
    await page.goto("/poc/ai-ready/test-skill");
    await expect(page).toHaveURL(/\/executive\/overview/);
  });

  test("Org 종합 Spec 페이지 렌더링", async ({ page }) => {
    await page.goto("/org-spec");
    await expect(
      page.getByRole("heading", { name: /Org 종합 Spec/ }),
    ).toBeVisible();
    // 3탭 존재
    await expect(page.getByRole("tab", { name: /Business/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Technical/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Quality/ })).toBeVisible();
  });

  // TODO(AIF-REQ-037): proxy fix is in src/worker.ts but takes effect only after
  // production deploy (post-merge). Pre-merge CI uses rx.minu.best which still runs
  // the old Worker (SPA fallback) → fetchOrgSpec receives HTML → fail.
  // Verification moved to post-merge production smoke (AIF-RPT-042 §DoD).
  test.skip("Org Spec — Business 탭 로딩", async ({ page }) => {
    await page.goto("/org-spec");
    await page.getByRole("tab", { name: /Business/ }).click();
    await expect(
      page.getByText(/Spec 요약/).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
