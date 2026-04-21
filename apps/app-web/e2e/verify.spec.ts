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


test.describe("Verify group", () => {
  test("HITL review page renders", async ({ page }) => {
    await page.goto("/hitl");
    await expect(page.getByRole("heading", { name: /HITL 검토/ })).toBeVisible();
  });

  test("fact check page renders", async ({ page }) => {
    await page.goto("/fact-check");
    await expect(page.getByRole("heading", { name: /Fact Check Dashboard/ })).toBeVisible();
  });

  test("gap analysis page renders", async ({ page }) => {
    await page.goto("/gap-analysis");
    await expect(page.getByRole("heading", { name: /Gap 분석/ })).toBeVisible();
  });

});
