// F392/TD-41: CF Access mock active — protected route — CF Access mock 없이 /welcome redirect. 재활성화 S224.
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


test.describe("Experience group", () => {
  test("mockup page renders", async ({ page }) => {
    await page.goto("/mockup");
    await expect(page.getByRole("heading", { name: /Working Mock-up/ })).toBeVisible();
  });

  test("PoC report page renders", async ({ page }) => {
    await page.goto("/poc-report");
    await expect(page.getByRole("heading", { name: /PoC 보고서/ })).toBeVisible();
  });
});

test.describe("Admin group", () => {
  test("ontology page renders", async ({ page }) => {
    await page.goto("/ontology");
    await expect(page.getByRole("heading", { name: /온톨로지 탐색기/ })).toBeVisible();
  });

  test("benchmark page renders", async ({ page }) => {
    await page.goto("/benchmark");
    await expect(page.getByRole("heading", { name: /Benchmark Report/ })).toBeVisible();
  });

  test("settings page renders", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /설정 Settings/ })).toBeVisible();
  });

  test("guide page renders", async ({ page }) => {
    await page.goto("/guide");
    await expect(page.getByRole("heading", { name: /이용 가이드/ })).toBeVisible();
  });
});

test.describe("Error handling", () => {
  test("404 page renders for unknown route", async ({ page }) => {
    await page.goto("/nonexistent-route");
    await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible();
  });
});
