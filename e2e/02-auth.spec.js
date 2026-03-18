const { test, expect } = require("@playwright/test");
const { TEST_USER, getAuthToken } = require("./helpers/auth");

test.describe("Authentication", () => {
    test("Login with valid credentials returns JWT", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: TEST_USER.email, password: TEST_USER.password },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        const token = body.token || body.data?.token;
        expect(token).toBeTruthy();
        expect(token.split(".")).toHaveLength(3);
    });

    test("Login with bad password returns error", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: TEST_USER.email, password: "wrongpassword123" },
        });
        expect([400, 401]).toContain(res.status());
    });

    test("Login with empty fields returns error", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: "" },
        });
        expect([400, 401]).toContain(res.status());
    });

    test("Protected endpoint with token returns 200", async ({ request }) => {
        const token = await getAuthToken(request);
        expect(token).toBeTruthy();
        const res = await request.get("/api/products", {
            headers: { Authorization: "Bearer " + token },
        });
        expect(res.status()).toBe(200);
    });
});
