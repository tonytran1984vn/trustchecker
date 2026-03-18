/**
 * E2E Auth Helper — uses pre-generated JWT token
 * On this VPS, bcrypt takes >90s so we skip live login.
 */
const jwt = require("jsonwebtoken");

const TEST_USER = {
    email: "owner@tonyisking.com",
    password: "123qaz12",
};

function generateTestToken() {
    return jwt.sign(
        { id: "test-user", sub: "test-user", email: TEST_USER.email, role: "owner", org_id: "test-org" },
        process.env.JWT_SECRET || "fallback",
        { expiresIn: "1h" }
    );
}

async function getAuthToken(request) {
    // Try real login first with 10s timeout, fallback to generated token
    try {
        const res = await request.post("/api/auth/login", {
            data: { email: TEST_USER.email, password: TEST_USER.password },
            timeout: 10000,
        });
        if (res.status() === 200) {
            const body = await res.json();
            return body.token || body.data?.token;
        }
    } catch(e) {
        // Login timed out — use generated token
    }
    return generateTestToken();
}

async function loginUI(page) {
    await page.fill("#loginEmail", TEST_USER.email);
    await page.fill("#loginPassword", TEST_USER.password);
    await page.click("button:has-text(\"Sign In\")");
    await page.waitForTimeout(5000);
}

module.exports = { TEST_USER, getAuthToken, loginUI, generateTestToken };
