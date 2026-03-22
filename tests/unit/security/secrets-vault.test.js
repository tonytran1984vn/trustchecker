const { vault, SecretsVault, SECRET_KEYS } = require('../../../server/security/secrets-vault');

describe('secrets-vault', () => {
    describe('SECRET_KEYS', () => {
        test('is an array', () => {
            expect(Array.isArray(SECRET_KEYS)).toBe(true);
        });

        test('contains jwt_secret', () => {
            expect(SECRET_KEYS).toContain('jwt_secret');
        });

        test('contains database_url', () => {
            expect(SECRET_KEYS).toContain('database_url');
        });

        test('contains stripe_key', () => {
            expect(SECRET_KEYS).toContain('stripe_key');
        });

        test('contains encryption_master_key', () => {
            expect(SECRET_KEYS).toContain('encryption_master_key');
        });

        test('contains smtp_password', () => {
            expect(SECRET_KEYS).toContain('smtp_password');
        });

        test('has 10 keys', () => {
            expect(SECRET_KEYS.length).toBe(10);
        });
    });

    describe('SecretsVault class', () => {
        let testVault;

        beforeEach(() => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            testVault = new SecretsVault();
            consoleSpy.mockRestore();
        });

        test('can be instantiated', () => {
            expect(testVault).toBeDefined();
        });

        test('has get method', () => {
            expect(typeof testVault.get).toBe('function');
        });

        test('has set method', () => {
            expect(typeof testVault.set).toBe('function');
        });

        test('has getRequired method', () => {
            expect(typeof testVault.getRequired).toBe('function');
        });

        test('has preload method', () => {
            expect(typeof testVault.preload).toBe('function');
        });

        test('has clearCache method', () => {
            expect(typeof testVault.clearCache).toBe('function');
        });

        test('has getAuditLog method', () => {
            expect(typeof testVault.getAuditLog).toBe('function');
        });

        test('has getStatus method', () => {
            expect(typeof testVault.getStatus).toBe('function');
        });

        test('defaults to env provider in test', () => {
            expect(testVault.provider.name).toBe('env');
        });

        test('getStatus returns provider info', () => {
            const status = testVault.getStatus();
            expect(status.provider).toBe('env');
            expect(typeof status.cachedSecrets).toBe('number');
        });

        test('getStatus returns knownKeys count', () => {
            expect(testVault.getStatus().knownKeys).toBe(SECRET_KEYS.length);
        });

        test('clearCache empties the cache', () => {
            testVault.clearCache();
            expect(testVault.getStatus().cachedSecrets).toBe(0);
        });

        test('getAuditLog returns array', () => {
            expect(Array.isArray(testVault.getAuditLog())).toBe(true);
        });
    });

    describe('EnvProvider via vault', () => {
        test('get returns null for non-existent key', async () => {
            const value = await vault.get('non_existent_secret_key_xyz');
            expect(value).toBeNull();
        });

        test('get returns env var value', async () => {
            process.env.TEST_VAULT_KEY = 'test-value';
            const value = await vault.get('test_vault_key');
            expect(value).toBe('test-value');
            delete process.env.TEST_VAULT_KEY;
        });

        test('set stores value in env', async () => {
            await vault.set('test_write_key', 'write-value');
            expect(process.env.TEST_WRITE_KEY).toBe('write-value');
            delete process.env.TEST_WRITE_KEY;
        });

        test('getRequired throws for missing key', async () => {
            await expect(vault.getRequired('definitely_missing_key_xyz')).rejects.toThrow('Required secret');
        });

        test('getRequired returns value for existing key', async () => {
            process.env.EXISTING_KEY = 'found';
            const value = await vault.getRequired('existing_key');
            expect(value).toBe('found');
            delete process.env.EXISTING_KEY;
        });
    });

    describe('rotation watcher', () => {
        test('startRotationWatcher is no-op for env provider', () => {
            expect(() => vault.startRotationWatcher()).not.toThrow();
        });

        test('stopRotationWatcher does not throw', () => {
            expect(() => vault.stopRotationWatcher()).not.toThrow();
        });
    });

    describe('singleton vault', () => {
        test('vault is an instance of SecretsVault', () => {
            expect(vault).toBeInstanceOf(SecretsVault);
        });
    });
});
