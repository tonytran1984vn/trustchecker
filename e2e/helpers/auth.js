const TEST_USER = {
    email: "owner@tonyisking.com",
    password: "123qaz12",
};

async function getAuthToken(request) {
    const res = await request.post("/api/auth/login", {
        data: { email: TEST_USER.email, password: TEST_USER.password },
        timeout: 15000,
    });
    const body = await res.json();
    return body.token || body.data?.token;
}

async function loginUI(page) {
    await page.fill("#loginEmail", TEST_USER.email);
    await page.fill("#loginPassword", TEST_USER.password);
    await page.click("button:has-text(\"Sign In\")");
    await page.waitForTimeout(2000);
}

module.exports = { TEST_USER, getAuthToken, loginUI };
