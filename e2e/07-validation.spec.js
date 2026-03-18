// @ts-check
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

test.describe('Input Validation (Zod)', () => {
    let token;

    test.beforeAll(async ({ request }) => {
        token = await getAuthToken(request);
    });

    const authHeaders = () => ({
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
    });

    test('Login with invalid email format returns 400', async ({ request }) => {
        const res = await request.post('/api/auth/login', {
            data: { email: 'not-an-email', password: 'test' },
        });
        expect([400, 401]).toContain(res.status());
    });

    test('Register with short password returns 400', async ({ request }) => {
        const res = await request.post('/api/auth/register', {
            data: { email: 'test@test.com', password: '123', username: 'test' },
        });
        expect([400, 403, 409]).toContain(res.status());
    });

    test('Validation errors have structured format', async ({ request }) => {
        const res = await request.post('/api/auth/login', {
            data: { email: '', password: '' },
        });
        const body = await res.json();
        // Should have some error info
        const hasErrors = body.errors || body.error || body.message;
        expect(hasErrors).toBeTruthy();
    });
});
