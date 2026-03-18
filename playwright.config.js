const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: process.env.CI ? "github" : "line",
    timeout: 120000,
    use: {
        baseURL: process.env.TEST_URL || "https://tonytran.work",
        trace: "off",
        ignoreHTTPSErrors: true,
    },
    projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
