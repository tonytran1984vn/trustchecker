jest.mock('../../../server/db', () => require('../../helpers/db-mock'));

const db = require('../../../server/db');
const { sendAlert, sendTest, getConfig, invalidateConfig } = require('../../../server/services/slack');

beforeEach(() => {
    db.__resetMocks();
    invalidateConfig();
});

describe('getConfig', () => {
    test('loads from DB on first call', async () => {
        db.get.mockResolvedValueOnce({ enabled: true, config: '{"webhooks":[]}' });
        const cfg = await getConfig();
        expect(cfg).toBeDefined();
        expect(cfg.enabled).toBe(true);
    });

    test('returns null when no row', async () => {
        db.get.mockResolvedValueOnce(null);
        const cfg = await getConfig();
        expect(cfg).toBeNull();
    });

    test('caches config within TTL', async () => {
        db.get.mockResolvedValueOnce({ enabled: true, config: '{}' });
        await getConfig();
        await getConfig();
        expect(db.get).toHaveBeenCalledTimes(1);
    });

    test('handles object config (not string)', async () => {
        db.get.mockResolvedValueOnce({ enabled: true, config: { webhooks: [] } });
        const cfg = await getConfig();
        expect(cfg.config.webhooks).toEqual([]);
    });
});

describe('sendAlert', () => {
    test('returns disabled when no config', async () => {
        db.get.mockResolvedValueOnce(null);
        const result = await sendAlert('test');
        expect(result.sent).toBe(false);
        expect(result.reason).toContain('disabled');
    });

    test('returns disabled when config not enabled', async () => {
        db.get.mockResolvedValueOnce({ enabled: false, config: '{}' });
        const result = await sendAlert('test');
        expect(result.sent).toBe(false);
    });

    test('returns no webhooks when empty', async () => {
        db.get.mockResolvedValueOnce({ enabled: true, config: '{"webhooks":[]}' });
        const result = await sendAlert('test');
        expect(result.sent).toBe(false);
        expect(result.reason).toContain('No webhook');
    });

    test('returns no template for unknown event', async () => {
        db.get.mockResolvedValueOnce({ enabled: true, config: '{"webhooks":[{"url":"http://test","enabled":true}]}' });
        const result = await sendAlert('nonexistent_event');
        expect(result.sent).toBe(false);
        expect(result.reason).toContain('No template');
    });

    test('sends to enabled webhooks', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
        db.get.mockResolvedValueOnce({
            enabled: true,
            config: JSON.stringify({ webhooks: [{ url: 'http://slack/hook', enabled: true, name: 'main' }] }),
        });
        const result = await sendAlert('test');
        expect(result.sent).toBe(true);
        expect(global.fetch).toHaveBeenCalled();
        console.log.mockRestore();
        delete global.fetch;
    });

    test('skips disabled webhooks', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        global.fetch = jest.fn();
        db.get.mockResolvedValueOnce({
            enabled: true,
            config: JSON.stringify({ webhooks: [{ url: 'http://test', enabled: false, name: 'off' }] }),
        });
        const result = await sendAlert('test');
        expect(global.fetch).not.toHaveBeenCalled();
        console.log.mockRestore();
        delete global.fetch;
    });

    test('filters by webhook event list', async () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
        db.get.mockResolvedValueOnce({
            enabled: true,
            config: JSON.stringify({ webhooks: [{ url: 'http://test', enabled: true, name: 'ch', events: ['fraud_detected'] }] }),
        });
        const result = await sendAlert('test'); // not in events list
        expect(global.fetch).not.toHaveBeenCalled();
        console.log.mockRestore();
        delete global.fetch;
    });
});

describe('sendTest', () => {
    test('calls sendAlert with test type', async () => {
        db.get.mockResolvedValueOnce(null);
        const result = await sendTest();
        expect(result.sent).toBe(false); // no config
    });
});

describe('invalidateConfig', () => {
    test('forces reload on next getConfig call', async () => {
        db.get.mockResolvedValue({ enabled: true, config: '{}' });
        await getConfig();
        invalidateConfig();
        await getConfig();
        expect(db.get).toHaveBeenCalledTimes(2);
    });
});
