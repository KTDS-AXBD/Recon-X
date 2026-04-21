// F392/TD-41: CF Access JWT mock으로 재활성화
// loginAs() → CF mock 기반 roleAs()로 대체
import { test, expect, type BrowserContext } from "@playwright/test";

/** Create a fresh browser context mocked as a specific CF Access role. */
async function roleAs(
  browser: import("@playwright/test").Browser,
  role: string,
  name = "E2E User",
): Promise<BrowserContext> {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ email: `${role}@ktds.co.kr`, name, role, userId: `e2e-${role}-001` }),
    });
  });
  await page.goto("/");
  return ctx;
}

test.describe("RBAC: Fact Check gap review visibility", () => {
  test("Reviewer can access fact-check page", async ({ browser }) => {
    const ctx = await roleAs(browser, "reviewer", "리뷰어");
    const page = await ctx.newPage();
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: "reviewer@ktds.co.kr", name: "리뷰어", role: "reviewer", userId: "e2e-reviewer-001" }),
      });
    });
    await page.goto("/fact-check");
    await expect(page).not.toHaveURL(/\/welcome/);
    await ctx.close();
  });

  test("Analyst can access fact-check page", async ({ browser }) => {
    const ctx = await roleAs(browser, "analyst", "분석가");
    const page = await ctx.newPage();
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: "analyst@ktds.co.kr", name: "분석가", role: "analyst", userId: "e2e-analyst-001" }),
      });
    });
    await page.goto("/fact-check");
    await expect(page).not.toHaveURL(/\/welcome/);
    await ctx.close();
  });
});

test.describe("RBAC: sidebar accessible when authenticated", () => {
  test("authenticated user sees sidebar", async ({ page }) => {
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: "dev@ktds.co.kr", name: "개발자", role: "developer", userId: "e2e-dev-001" }),
      });
    });
    await page.goto("/executive/overview");
    await expect(page).not.toHaveURL(/\/welcome/);
  });
});
