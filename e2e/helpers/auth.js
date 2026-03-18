const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '..', '.auth-token');

const TEST_USER = {
    email: "owner@tonyisking.com",
    password: "123qaz12",
};

/**
 * Get auth token — reads from global setup cache first,
 * falls back to login API if cache unavailable.
 */
async function getAuthToken(request) {
    // Try cached token first (avoids rate limiting)
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
            if (token && token.length > 20) return token;
        }
    } catch (e) { /* ignore */ }

    // Fallback to API login
    const res = await request.post("/api/auth/login", {
        data: { email: TEST_USER.email, password: TEST_USER.password },
        timeout: 15000,
    });
    const body = await res.json();
    const token = body.token || body.data?.token;

    // Cache for subsequent test files
    if (token) {
        try { fs.writeFileSync(TOKEN_FILE, token); } catch (e) { /* ignore */ }
    }

    return token;
}

async function loginUI(page) {
    await page.fill("#loginEmail", TEST_USER.email);
    await page.fill("#loginPassword", TEST_USER.password);
    await page.click("button:has-text(\"Sign In\")");
    await page.waitForTimeout(2000);
}

module.exports = { TEST_USER, getAuthToken, loginUI };
