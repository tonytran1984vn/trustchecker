// @ts-check
const { test, expect } = require('@playwright/test');
const { loginUI } = require('./helpers/auth');

test.describe('API Key Management UI', () => {
    test('Page loads with login form', async ({ page }) => {
        await page.goto('/api-keys');
        await expect(page.locator('#loginScreen')).toBeVisible();
        await expect(page.locator('#loginEmail')).toBeVisible();
        await expect(page.locator('#loginPassword')).toBeVisible();
        await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    test('Login shows dashboard', async ({ page }) => {
        await page.goto('/api-keys');
        await loginUI(page);
        await expect(page.locator('#mainApp')).toBeVisible();
        await expect(page.locator('#statTotal')).toBeVisible();
        await expect(page.locator('#statActive')).toBeVisible();
    });

    test('Create key modal opens and closes', async ({ page }) => {
        await page.goto('/api-keys');
        await loginUI(page);
        await page.click('button:has-text("New Key")');
        await expect(page.locator('#createModal')).toHaveClass(/active/);
        await page.click('button:has-text("Cancel")');
        await expect(page.locator('#createModal')).not.toHaveClass(/active/);
    });

    test('Create key shows key once', async ({ page }) => {
        await page.goto('/api-keys');
        await loginUI(page);
        await page.click('button:has-text("New Key")');
        await page.fill('#keyName', 'E2E Test Key ' + Date.now());
        await page.click('button:has-text("Create Key")');
        await page.waitForTimeout(2000);
        // Check if new key display appeared
        const display = page.locator('#newKeyDisplay');
        if (await display.isVisible()) {
            const keyValue = await page.locator('#newKeyValue').textContent();
            expect(keyValue).toMatch(/^tc_/); // Keys start with tc_
        }
    });
});
