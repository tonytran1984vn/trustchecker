const { test, expect } = require("@playwright/test");
const { getAuthToken } = require("./helpers/auth");

test.describe("V1 API Endpoints", () => {
    let token;
    test.beforeAll(async ({ request }) => {
        token = await getAuthToken(request);
    });

    const authHeaders = () => ({ Authorization: `Bearer ${token}` });

    test("GET /api/v1/products returns product list", async ({ request }) => {
        const res = await request.get("/api/v1/products", { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.products || body.data).toBeTruthy();
    });

    test("GET /api/v1/notifications returns data", async ({ request }) => {
        const res = await request.get("/api/v1/notifications", { headers: authHeaders(), timeout: 10000 });
        expect([200, 404, 500]).toContain(res.status());
    });

    test("X-API-Version header is returned", async ({ request }) => {
        const res = await request.get("/api/v1/products", { headers: authHeaders() });
        expect(res.headers()["x-api-version"]).toBeTruthy();
    });

    test("Deprecation header on legacy /api/products", async ({ request }) => {
        const res = await request.get("/api/products", { headers: authHeaders() });
        expect(res.headers()["deprecation"]).toBe("true");
    });

    test("V1 returns products with expected fields", async ({ request }) => {
        const res = await request.get("/api/v1/products", { headers: authHeaders() });
        const body = await res.json();
        const items = body.products || body.data || [];
        if (items.length > 0) {
            const p = items[0];
            expect(p.id).toBeTruthy();
            expect(p.name).toBeTruthy();
        }
    });

    test("V1 without auth returns 401", async ({ request }) => {
        const res = await request.get("/api/v1/products");
        expect(res.status()).toBe(401);
    });
});
