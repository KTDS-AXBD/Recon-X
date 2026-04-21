import { test as setup } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const AUTH_FILE = "e2e/.auth/user.json";

// F392/TD-41: CF Access JWT mock — /auth/me route stub
// CF Access 환경에서는 CF_Authorization 쿠키가 자동 주입됨.
// E2E 테스트에서는 /auth/me fetch를 route intercept하여 analyst 사용자로 stub.
setup("setup CF Access mock auth state", async ({ page }) => {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Intercept /auth/me before navigating — AuthContext fetches this on mount
  await page.route("**/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        email: "test@ktds.co.kr",
        name: "E2E Test User",
        role: "analyst",
        roles: ["analyst"],
        userId: "e2e-test-001",
      }),
    });
  });

  // Navigate to trigger AuthContext initialization
  await page.goto("/");

  // Save storageState (cookies + localStorage) for reuse across tests
  await page.context().storageState({ path: AUTH_FILE });
});
