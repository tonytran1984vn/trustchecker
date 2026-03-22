const WebhookEngine = require('../../../server/engines/infrastructure/webhookEngine').constructor;

let wh;
beforeEach(() => {
    wh = new WebhookEngine();
});

describe('WebhookEngine', () => {
    describe('_validateUrl', () => {
        test('allows valid HTTPS URLs', () => {
            expect(wh._validateUrl('https://example.com/webhook')).toBe(true);
        });

        test('allows valid HTTP URLs', () => {
            expect(wh._validateUrl('http://example.com/webhook')).toBe(true);
        });

        test('blocks localhost', () => {
            expect(wh._validateUrl('http://localhost/admin')).toBe(false);
        });

        test('blocks 127.0.0.1', () => {
            expect(wh._validateUrl('http://127.0.0.1/secret')).toBe(false);
        });

        test('blocks 10.x private IPs', () => {
            expect(wh._validateUrl('http://10.0.0.1/api')).toBe(false);
        });

        test('blocks 192.168.x IPs', () => {
            expect(wh._validateUrl('http://192.168.1.1/internal')).toBe(false);
        });

        test('blocks 172.16-31.x IPs', () => {
            expect(wh._validateUrl('http://172.16.0.1/internal')).toBe(false);
        });

        test('blocks metadata endpoints', () => {
            expect(wh._validateUrl('http://metadata.google.internal/v1')).toBe(false);
        });

        test('blocks dangerous ports', () => {
            expect(wh._validateUrl('http://example.com:5432/db')).toBe(false);
            expect(wh._validateUrl('http://example.com:6379/redis')).toBe(false);
        });

        test('returns false for invalid URLs', () => {
            expect(wh._validateUrl('not-a-url')).toBe(false);
        });
    });

    describe('subscribe', () => {
        test('creates subscription and returns ID', () => {
            const id = wh.subscribe('FRAUD_DETECTED', 'https://example.com/hooks', 'secret');
            expect(id).toBeDefined();
            expect(wh.listSubscriptions().length).toBe(1);
        });

        test('throws for private URL', () => {
            expect(() => wh.subscribe('test', 'http://localhost/hooks', 'secret')).toThrow('Invalid webhook URL');
        });

        test('allows multiple subscribers per event', () => {
            wh.subscribe('evt', 'https://a.com/h', 's1');
            wh.subscribe('evt', 'https://b.com/h', 's2');
            expect(wh.listSubscriptions().length).toBe(2);
        });
    });

    describe('unsubscribe', () => {
        test('removes subscription', () => {
            const id = wh.subscribe('evt', 'https://a.com/h', 's');
            expect(wh.unsubscribe(id)).toBe(true);
            expect(wh.listSubscriptions().length).toBe(0);
        });

        test('returns false for unknown ID', () => {
            expect(wh.unsubscribe('fake-id')).toBe(false);
        });
    });

    describe('deliver', () => {
        test('delivers to active subscribers', async () => {
            wh.subscribe('evt', 'https://a.com/h', 'secret');
            const results = await wh.deliver('evt', { test: true });
            expect(results.length).toBe(1);
            expect(results[0].status).toBe('delivered');
        });

        test('returns empty for no subscribers', async () => {
            const results = await wh.deliver('unknown_event', {});
            expect(results).toEqual([]);
        });

        test('includes HMAC signature', async () => {
            wh.subscribe('evt', 'https://a.com/h', 'my-secret');
            const results = await wh.deliver('evt', { data: 'test' });
            expect(results[0].signature).toMatch(/^[a-f0-9]+$/);
        });
    });

    describe('sanitizePayload', () => {
        test('redacts password fields', () => {
            const result = WebhookEngine.sanitizePayload({ user: 'admin', password: 'secret123' });
            expect(result.password).toBe('[REDACTED]');
            expect(result.user).toBe('admin');
        });

        test('redacts nested sensitive fields', () => {
            const result = WebhookEngine.sanitizePayload({ data: { api_key: 'xxx', name: 'ok' } });
            expect(result.data.api_key).toBe('[REDACTED]');
            expect(result.data.name).toBe('ok');
        });

        test('handles null/non-object input', () => {
            expect(WebhookEngine.sanitizePayload(null)).toBeNull();
            expect(WebhookEngine.sanitizePayload('string')).toBe('string');
        });

        test('redacts email and phone', () => {
            const result = WebhookEngine.sanitizePayload({ email: 'a@b.com', phone: '1234', name: 'test' });
            expect(result.email).toBe('[REDACTED]');
            expect(result.phone).toBe('[REDACTED]');
        });
    });

    describe('_sign', () => {
        test('returns HMAC SHA-256 hex', () => {
            const sig = wh._sign({ test: true }, 'secret');
            expect(sig).toMatch(/^[a-f0-9]{64}$/);
        });

        test('deterministic', () => {
            const s1 = wh._sign({ a: 1 }, 'key');
            const s2 = wh._sign({ a: 1 }, 'key');
            expect(s1).toBe(s2);
        });

        test('different for different secrets', () => {
            const s1 = wh._sign({ a: 1 }, 'key1');
            const s2 = wh._sign({ a: 1 }, 'key2');
            expect(s1).not.toBe(s2);
        });
    });

    describe('getStats', () => {
        test('returns stats with zero deliveries', () => {
            const stats = wh.getStats();
            expect(stats.total_deliveries).toBe(0);
            expect(stats.success_rate).toBe(100);
        });

        test('tracks delivery counts', async () => {
            wh.subscribe('evt', 'https://a.com/h', 's');
            await wh.deliver('evt', {});
            const stats = wh.getStats();
            expect(stats.total_deliveries).toBe(1);
            expect(stats.delivered).toBe(1);
        });
    });

    describe('getDeliveryLog', () => {
        test('returns most recent deliveries', async () => {
            wh.subscribe('evt', 'https://a.com/h', 's');
            await wh.deliver('evt', { n: 1 });
            await wh.deliver('evt', { n: 2 });
            const log = wh.getDeliveryLog(10);
            expect(log.length).toBe(2);
        });
    });
});
