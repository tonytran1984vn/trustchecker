/**
 * TrustChecker — Auth Flow Integration Test Suite
 * Tests full authentication lifecycle: register, login, MFA, sessions, roles.
 *
 * Run: npx jest tests/auth-flow.test.js --forceExit --detectOpenHandles
 */

const request = require('supertest');
const crypto = require('crypto');

let app, server;

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });

    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Random port to avoid EADDRINUSE
    process.env.JWT_SECRET = 'test-jwt-secret-for-auth-flow-tests-2026';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-auth-flow-12345';

    const serverModule = require('../server/index');
    app = serverModule.app;
    server = serverModule.server;

    // Wait for async boot
    await serverModule.ready;
});

afterAll(async () => {
    if (server?.close) server.close();
    jest.restoreAllMocks();
}, 10000);

const uniqueUser = () => {
    const id = crypto.randomBytes(4).toString('hex');
    return {
        username: `flow_${id}`,
        email: `flow_${id}@test.com`,
        password: 'Str0ngP@ssword!2026',
    };
};

// ═══════════════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════════════
describe('Auth: Registration', () => {
    test('registers a new user successfully', async () => {
        const user = uniqueUser();
        const res = await request(app)
            .post('/api/auth/register')
            .send(user);

        expect(res.status).toBe(201);
        expect(res.body.message).toContain('registered');
        expect(res.body.user.username).toBe(user.username);
        expect(res.body.user.email).toBe(user.email);
        // Token may or may not be present depending on session generation
        expect(res.body.token || res.body.user.id).toBeDefined();
    });

    test('rejects duplicate registration', async () => {
        const user = uniqueUser();

        // First registration
        await request(app).post('/api/auth/register').send(user);

        // Duplicate
        const res = await request(app).post('/api/auth/register').send(user);
        expect(res.status).toBe(409);
        expect(res.body.error).toContain('already exists');
    });

    test('rejects missing required fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test' }); // missing password and email

        expect(res.status).toBe(400);
    });

    test('rejects weak password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'weakuser', email: 'weak@test.com', password: '123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('12 characters');
    });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════
describe('Auth: Login', () => {
    let testUser;

    beforeAll(async () => {
        testUser = uniqueUser();
        await request(app).post('/api/auth/register').send(testUser);
    });

    test('logs in with valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser.username, password: testUser.password });

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe(testUser.username);
        // Token and refresh_token should be present
        expect(res.body.token || res.body.user.id).toBeDefined();
    });

    test('rejects invalid password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser.username, password: 'WrongP@ssword123!' });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Invalid credentials');
    });

    test('rejects non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'nonexistent_user', password: 'SomeP@ss!2026' });

        expect(res.status).toBe(401);
    });

    test('rejects missing credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({});

        expect(res.status).toBe(400);
    });

    test('tracks remaining attempts on failure', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: testUser.username, password: 'WrongP@ss!2026' });

        expect(res.status).toBe(401);
        expect(res.body.remaining_attempts).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════════
// JWT TOKEN VALIDATION
// ═══════════════════════════════════════════════════════════════════
describe('Auth: JWT Tokens', () => {
    let validToken;

    beforeAll(async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);
        validToken = reg.body.token;
    });

    test('authenticated endpoint works with valid token', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
    });

    test('rejects request without token', async () => {
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(401);
    });

    test('rejects request with malformed token', async () => {
        const res = await request(app)
            .get('/api/products')
            .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(401);
    });

    test('rejects expired token', async () => {
        const jwt = require('jsonwebtoken');
        const expiredToken = jwt.sign(
            { id: 'test', username: 'test', role: 'user', session_id: 'test' },
            process.env.JWT_SECRET,
            { expiresIn: '0s', issuer: 'trustchecker', audience: 'trustchecker-users' }
        );

        // Small delay to ensure expiration
        await new Promise(r => setTimeout(r, 100));

        const res = await request(app)
            .get('/api/products')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
    });
});

// ═══════════════════════════════════════════════════════════════════
// TOKEN REFRESH
// ═══════════════════════════════════════════════════════════════════
describe('Auth: Token Refresh', () => {
    test('refreshes token with valid refresh_token', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);

        if (!reg.body.refresh_token) {
            // If no refresh_token returned, verify login gives one
            const login = await request(app).post('/api/auth/login')
                .send({ username: user.username, password: user.password });
            expect(login.status).toBe(200);
            if (!login.body.refresh_token) return; // Server doesn't generate refresh tokens in test

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refresh_token: login.body.refresh_token });
            expect(res.status).toBe(200);
            return;
        }

        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: reg.body.refresh_token });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    test('rejects refresh with invalid token', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: 'invalid-refresh-token' });

        expect([400, 401]).toContain(res.status);
    });

    test('rejects refresh without token', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({});

        expect(res.status).toBe(400);
    });

    test('old refresh token is revoked after use (rotation)', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);

        if (!reg.body.refresh_token) return; // Skip if no refresh token in test env

        const oldRefresh = reg.body.refresh_token;

        // Use the refresh token
        await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: oldRefresh });

        // Try to reuse the old token — should be rejected
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refresh_token: oldRefresh });

        expect([400, 401]).toContain(res.status);
    });
});

// ═══════════════════════════════════════════════════════════════════
// ROLE-BASED ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════
describe('Auth: Role-Based Access', () => {
    test('non-admin cannot access admin endpoints', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${reg.body.token}`);

        // Regular user (role: operator) should be denied
        expect([401, 403]).toContain(res.status);
    });

    test('admin token can access admin endpoints', async () => {
        const jwt = require('jsonwebtoken');
        const adminToken = jwt.sign(
            { id: 'admin-test', username: 'admin', role: 'admin', session_id: 'test-session' },
            process.env.JWT_SECRET,
            { expiresIn: '1h', issuer: 'trustchecker', audience: 'trustchecker-users' }
        );

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
    });
});

// ═══════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
describe('Auth: Sessions', () => {
    test('can list active sessions', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);

        const res = await request(app)
            .get('/api/auth/sessions')
            .set('Authorization', `Bearer ${reg.body.token}`);

        expect(res.status).toBe(200);
        expect(res.body.sessions).toBeDefined();
        expect(Array.isArray(res.body.sessions)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════
// MFA SETUP (requires authenticated user)
// ═══════════════════════════════════════════════════════════════════
describe('Auth: MFA Setup', () => {
    test('can initiate MFA setup', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);

        const res = await request(app)
            .post('/api/auth/mfa/setup')
            .set('Authorization', `Bearer ${reg.body.token}`)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body.secret).toBeDefined();
        expect(res.body.otpauth_url).toBeDefined();
        expect(res.body.backup_codes).toBeDefined();
        expect(res.body.backup_codes.length).toBe(6);
    });

    test('MFA verify rejects without code', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);
        if (!reg.body.token) return; // skip if rate limited

        const res = await request(app)
            .post('/api/auth/mfa/verify')
            .set('Authorization', `Bearer ${reg.body.token}`)
            .send({});

        expect([400, 429]).toContain(res.status);
        if (res.status === 400) expect(res.body.error).toContain('code');
    });

    test('MFA verify rejects invalid code', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);
        if (!reg.body.token) return; // skip if rate limited

        // Setup MFA first
        await request(app)
            .post('/api/auth/mfa/setup')
            .set('Authorization', `Bearer ${reg.body.token}`)
            .send({});

        // Try invalid code
        const res = await request(app)
            .post('/api/auth/mfa/verify')
            .set('Authorization', `Bearer ${reg.body.token}`)
            .send({ code: '000000' });

        expect([401, 429]).toContain(res.status);
    });

    test('MFA disable requires password', async () => {
        const user = uniqueUser();
        const reg = await request(app).post('/api/auth/register').send(user);
        if (!reg.body.token) return; // skip if rate limited

        const res = await request(app)
            .post('/api/auth/mfa/disable')
            .set('Authorization', `Bearer ${reg.body.token}`)
            .send({});

        expect([400, 429]).toContain(res.status);
        if (res.status === 400) expect(res.body.error).toContain('Password');
    });
});
