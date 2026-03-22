const { i18nMiddleware, SUPPORTED_LOCALES } = require('../../../server/middleware/i18n');

function mockReq(query = {}, headers = {}) {
    return { query, headers };
}

function mockRes() {
    return { setHeader: jest.fn() };
}

describe('i18nMiddleware', () => {
    test('defaults to en', () => {
        const req = mockReq();
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('en');
    });

    test('uses query param lang', () => {
        const req = mockReq({ lang: 'vi' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('vi');
    });

    test('uses Accept-Language header', () => {
        const req = mockReq({}, { 'accept-language': 'ja,en;q=0.9' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('ja');
    });

    test('query param overrides header', () => {
        const req = mockReq({ lang: 'ko' }, { 'accept-language': 'en' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('ko');
    });

    test('unsupported locale falls back to en', () => {
        const req = mockReq({}, { 'accept-language': 'xx' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('en');
    });

    test('sets Content-Language header', () => {
        const res = mockRes();
        i18nMiddleware(mockReq({}, { 'accept-language': 'fr' }), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Content-Language', 'fr');
    });

    test('calls next()', () => {
        const next = jest.fn();
        i18nMiddleware(mockReq(), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('supports vi locale', () => {
        const req = mockReq({}, { 'accept-language': 'vi-VN,vi;q=0.9' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('vi');
    });

    test('supports zh locale', () => {
        const req = mockReq({}, { 'accept-language': 'zh-CN' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('zh');
    });

    test('supports de locale', () => {
        const req = mockReq({}, { 'accept-language': 'de-DE' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('de');
    });

    test('supports es locale', () => {
        const req = mockReq({}, { 'accept-language': 'es' });
        i18nMiddleware(req, mockRes(), jest.fn());
        expect(req.locale).toBe('es');
    });
});

describe('SUPPORTED_LOCALES', () => {
    test('has 8 locales', () => {
        expect(SUPPORTED_LOCALES.length).toBe(8);
    });

    test('includes en, vi, zh, ja, ko, de, fr, es', () => {
        for (const l of ['en', 'vi', 'zh', 'ja', 'ko', 'de', 'fr', 'es']) {
            expect(SUPPORTED_LOCALES).toContain(l);
        }
    });
});
