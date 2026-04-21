import { test, expect } from "@playwright/test";

// F392/TD-41: CF Access JWT mock으로 재활성화 (auth.setup.ts 참조)

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to /welcome", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/welcome/);
    await ctx.close();
  });

  test("welcome page is accessible without auth", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/welcome");
    await expect(page.locator("body")).not.toBeEmpty();
    await ctx.close();
  });

  test("authenticated user can access executive overview", async ({ page }) => {
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          email: "test@ktds.co.kr",
          name: "E2E Test User",
          role: "analyst",
          userId: "e2e-test-001",
        }),
      });
    });
    await page.goto("/executive/overview");
    await expect(page).not.toHaveURL(/\/welcome/);
  });
});
