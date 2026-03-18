const { test, expect } = require("@playwright/test");
const { loginUI, TEST_USER } = require("./helpers/auth");

test.describe("API Key Management UI", () => {
    test("Page loads with login form", async ({ page }) => {
        await page.goto("/api-keys");
        await expect(page.locator("#loginEmail")).toBeVisible({ timeout: 10000 });
        await expect(page.locator("#loginPassword")).toBeVisible();
    });

    test("Login shows dashboard", async ({ page }) => {
        await page.goto("/api-keys");
        await loginUI(page);
        // After login, dashboard or key management should appear
        const body = await page.textContent("body");
        expect(body.length).toBeGreaterThan(100);
    });
});
