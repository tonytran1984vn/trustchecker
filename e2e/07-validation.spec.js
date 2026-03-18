const { test, expect } = require("@playwright/test");

test.describe("Input Validation", () => {
    test("Login with invalid email returns error", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: "not-an-email", password: "test123" },
        });
        expect([400, 401]).toContain(res.status());
        const body = await res.json();
        expect(body.error || body.errors).toBeTruthy();
    });

    test("Login with empty body returns error", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: {},
        });
        expect([400, 401]).toContain(res.status());
    });

    test("POST with missing required fields returns error", async ({ request }) => {
        const res = await request.post("/api/auth/login", {
            data: { email: "", password: "" },
        });
        expect([400, 401]).toContain(res.status());
    });
});
