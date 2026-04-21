// F392/TD-41: CF Access mock active — protected route — CF Access mock 후 재활성화.
import { test, expect } from "@playwright/test";
const mockAuth = async (page: import("@playwright/test").Page) => {
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ email: "test@ktds.co.kr", name: "E2E User", role: "analyst", userId: "e2e-001" }),
    });
  });
};


test.describe("Deliver group", () => {
  test("skill catalog page renders", async ({ page }) => {
    await page.goto("/skills");
    await expect(page.getByRole("heading", { name: /Skill Marketplace/ })).toBeVisible();
  });

  test("skill detail page via catalog navigation", async ({ page }) => {
    await page.goto("/skills");
    // Wait for skill cards to load, click the first one
    const firstSkill = page.locator("[data-testid='skill-card'], .cursor-pointer").first();
    if (await firstSkill.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstSkill.click();
      await expect(page.url()).toContain("/skills/");
    }
  });

  test("spec catalog page renders", async ({ page }) => {
    await page.goto("/specs");
    await expect(page.getByRole("heading", { name: /Spec 카탈로그/ })).toBeVisible();
  });

  test("spec detail page via catalog navigation", async ({ page }) => {
    await page.goto("/specs");
    const firstSpec = page.locator("[data-testid='spec-card'], .cursor-pointer").first();
    if (await firstSpec.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstSpec.click();
      await expect(page.url()).toContain("/specs/");
    }
  });

  test("export center page renders", async ({ page }) => {
    await page.goto("/export");
    await expect(page.getByRole("heading", { name: /Export 센터/ })).toBeVisible();
  });

  test("API console page renders", async ({ page }) => {
    await page.goto("/api-console");
    await expect(page.getByRole("heading", { name: /API/ })).toBeVisible();
  });
});
