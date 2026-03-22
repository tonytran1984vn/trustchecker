describe('config', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        console.log.mockRestore();
        console.warn.mockRestore();
        console.error.mockRestore();
    });

    test('sets defaults for PORT and NODE_ENV', () => {
        delete process.env.PORT;
        delete process.env.NODE_ENV;
        process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-32';
        process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-ok!';

        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { validateConfig } = require('../../server/config');
        const result = validateConfig();

        expect(process.env.PORT).toBe('4000');
        expect(result.dbMode).toBe('postgresql');
        mockExit.mockRestore();
    });

    test('reports production errors for missing JWT_SECRET', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.JWT_SECRET;
        process.env.CORS_ORIGINS = 'https://example.com';

        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { validateConfig } = require('../../server/config');

        validateConfig();
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(console.error).toHaveBeenCalled();
        mockExit.mockRestore();
    });

    test('rejects wildcard CORS in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.ENCRYPTION_KEY = 'b'.repeat(32);
        process.env.CORS_ORIGINS = '*';

        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { validateConfig } = require('../../server/config');

        validateConfig();
        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
    });

    test('passes in development without production vars', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.JWT_SECRET;

        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { validateConfig } = require('../../server/config');

        const result = validateConfig();
        expect(result.env).toBe('development');
        expect(result.isProduction).toBe(false);
        expect(mockExit).not.toHaveBeenCalled();
        mockExit.mockRestore();
    });

    test('DB_MODES has POSTGRESQL', () => {
        const { DB_MODES } = require('../../server/config');
        expect(DB_MODES.POSTGRESQL).toBe('postgresql');
    });

    test('rejects short JWT_SECRET in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'short';
        process.env.ENCRYPTION_KEY = 'b'.repeat(32);
        process.env.CORS_ORIGINS = 'https://example.com';

        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
        const { validateConfig } = require('../../server/config');

        validateConfig();
        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
    });
});

describe('warnDefaultSecrets', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        console.warn.mockRestore();
        console.log.mockRestore();
    });

    test('warns on insecure JWT_SECRET', () => {
        process.env.JWT_SECRET = 'trustchecker-secret-key-DEV-ONLY';
        const { warnDefaultSecrets } = require('../../server/config');
        warnDefaultSecrets();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET'));
    });

    test('warns on short JWT_SECRET', () => {
        process.env.JWT_SECRET = 'short';
        const { warnDefaultSecrets } = require('../../server/config');
        warnDefaultSecrets();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET'));
    });

    test('warns on missing ENCRYPTION_KEY', () => {
        process.env.JWT_SECRET = 'a'.repeat(64);
        delete process.env.ENCRYPTION_KEY;
        const { warnDefaultSecrets } = require('../../server/config');
        warnDefaultSecrets();
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('ENCRYPTION_KEY'));
    });

    test('does not warn on secure secrets', () => {
        process.env.JWT_SECRET = 'a'.repeat(64);
        process.env.ENCRYPTION_KEY = 'b'.repeat(64);
        const { warnDefaultSecrets } = require('../../server/config');
        warnDefaultSecrets();
        expect(console.warn).not.toHaveBeenCalled();
    });
});
