const { WAF } = require('../../../server/middleware/waf');

describe('WAF', () => {
    let waf;
    afterEach(() => { if (waf) waf.stop(); });

    function mockReq(overrides = {}) {
        return {
            method: 'GET',
            path: '/api/test',
            originalUrl: '/api/test',
            headers: { 'user-agent': 'Mozilla/5.0' },
            query: {},
            body: {},
            params: {},
            ip: '1.2.3.4',
            connection: { remoteAddress: '1.2.3.4' },
            ...overrides,
        };
    }

    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    describe('basic operation', () => {
        test('allows normal requests', () => {
            waf = new WAF({ logBlocked: false });
            const next = jest.fn();
            waf.middleware()(mockReq(), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('disabled WAF passes everything', () => {
            waf = new WAF({ enabled: false });
            const next = jest.fn();
            waf.middleware()(mockReq(), mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('whitelisted IP bypasses checks', () => {
            waf = new WAF({ whitelist: ['1.2.3.4'], logBlocked: false });
            const req = mockReq({ query: { q: "SELECT * FROM users" } });
            const next = jest.fn();
            waf.middleware()(req, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('SQL injection', () => {
        beforeEach(() => { waf = new WAF({ logBlocked: false }); });

        test('blocks UNION SELECT', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: "1 UNION SELECT * FROM users" } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks SELECT FROM in body', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ method: 'POST', body: { name: "admin' OR 1=1" } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks DROP TABLE', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: "DROP TABLE users" } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks benchmark()', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: "benchmark(1000000,md5('a'))" } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks sleep()', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: "sleep(5)" } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('XSS', () => {
        beforeEach(() => { waf = new WAF({ logBlocked: false }); });

        test('blocks <script> tags', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: '<script>alert(1)</script>' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks javascript: protocol', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { url: 'javascript:void(0)' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks onerror=', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: '<img onerror=alert(1)>' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks iframe', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: '<iframe src="evil.com">' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks document.cookie', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: 'document.cookie' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('path traversal', () => {
        beforeEach(() => { waf = new WAF({ logBlocked: false }); });

        test('blocks ../', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ originalUrl: '/api/../../../etc/passwd' }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks /etc/passwd', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { file: '/etc/passwd' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks null bytes', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ query: { q: 'file%00.txt' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('bot detection', () => {
        beforeEach(() => { waf = new WAF({ logBlocked: false }); });

        test('blocks sqlmap', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'sqlmap/1.5' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks nikto', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'Nikto scanner' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks nmap', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'Nmap Scripting Engine' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks nuclei', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'nuclei' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('suspicious headers', () => {
        beforeEach(() => { waf = new WAF({ logBlocked: false }); });

        test('blocks x-forwarded-host', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'Mozilla', 'x-forwarded-host': 'evil.com' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks x-original-url', () => {
            const res = mockRes();
            waf.middleware()(mockReq({ headers: { 'user-agent': 'Mozilla', 'x-original-url': '/admin' } }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('rate limiting', () => {
        test('blocks after exceeding limit', () => {
            waf = new WAF({ ratePerMinute: 3, logBlocked: false });
            const mw = waf.middleware();
            for (let i = 0; i < 3; i++) {
                mw(mockReq(), mockRes(), jest.fn());
            }
            const res = mockRes();
            mw(mockReq(), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('custom rules', () => {
        test('applies custom rule', () => {
            waf = new WAF({
                logBlocked: false,
                customRules: [{ test: req => req.path === '/forbidden', reason: 'Custom block' }],
            });
            const res = mockRes();
            waf.middleware()(mockReq({ path: '/forbidden' }), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('management', () => {
        test('addWhitelist / removeWhitelist', () => {
            waf = new WAF({ logBlocked: false });
            waf.addWhitelist('5.5.5.5');
            expect(waf.whitelist.has('5.5.5.5')).toBe(true);
            waf.removeWhitelist('5.5.5.5');
            expect(waf.whitelist.has('5.5.5.5')).toBe(false);
        });

        test('getStats', () => {
            waf = new WAF({ logBlocked: false });
            const s = waf.getStats();
            expect(s.totalRequests).toBe(0);
            expect(s.blockRate).toBe(0);
        });

        test('addRule', () => {
            waf = new WAF();
            waf.addRule({ test: () => false });
            expect(waf.customRules.length).toBe(1);
        });
    });
});
