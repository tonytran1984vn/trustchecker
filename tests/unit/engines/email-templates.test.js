const email = require('../../../server/engines/infrastructure/emailTemplates');
const EmailClass = email.constructor;

let engine;
beforeEach(() => { engine = new EmailClass(); });

describe('EmailTemplates', () => {
    describe('passwordReset', () => {
        test('generates HTML with token', () => {
            const html = engine.passwordReset('John', 'abc123', 'https://app.com/reset');
            expect(html).toContain('John');
            expect(html).toContain('abc123');
            expect(html).toContain('Reset Password');
        });
    });

    describe('welcome', () => {
        test('includes username and 100 free scans', () => {
            const html = engine.welcome('Alice', 'https://app.com');
            expect(html).toContain('Alice');
            expect(html).toContain('100');
        });
    });

    describe('fraudAlert', () => {
        test('CRITICAL severity for score > 0.8', () => {
            const html = engine.fraudAlert('Widget', 0.9, 'scan-1');
            expect(html).toContain('CRITICAL');
            expect(html).toContain('alert-danger');
        });

        test('HIGH severity for score > 0.5', () => {
            const html = engine.fraudAlert('Widget', 0.6, 'scan-1');
            expect(html).toContain('HIGH');
        });
    });

    describe('scanReceipt', () => {
        test('valid result shows success', () => {
            const html = engine.scanReceipt('Product', 'valid', 92, 0.05, '0xabc');
            expect(html).toContain('✅');
            expect(html).toContain('alert-success');
        });

        test('suspicious result shows warning', () => {
            const html = engine.scanReceipt('Product', 'suspicious', 50, 0.5, '0x');
            expect(html).toContain('⚠️');
        });
    });

    describe('invoice', () => {
        test('includes plan and amount', () => {
            const html = engine.invoice('Pro', 99, 'USD', 'INV-001', 'Jan 2026');
            expect(html).toContain('Pro');
            expect(html).toContain('99');
            expect(html).toContain('INV-001');
        });
    });

    describe('kycStatus', () => {
        test('approved shows success', () => {
            const html = engine.kycStatus('Acme Corp', 'approved');
            expect(html).toContain('✅');
        });

        test('rejected shows danger', () => {
            const html = engine.kycStatus('Acme Corp', 'rejected');
            expect(html).toContain('❌');
        });
    });

    describe('weeklyDigest', () => {
        test('includes stats', () => {
            const html = engine.weeklyDigest({ total_scans: 500, fraud_alerts: 3, avg_trust: 88, new_products: 10 });
            expect(html).toContain('500');
            expect(html).toContain('88');
        });
    });

    describe('supplierInvite', () => {
        test('includes inviter and company', () => {
            const html = engine.supplierInvite('Bob', 'Acme', 'SupplierCo', 'https://join.com');
            expect(html).toContain('Bob');
            expect(html).toContain('SupplierCo');
        });

        test('includes custom message', () => {
            const html = engine.supplierInvite('Bob', 'Acme', 'SupplierCo', 'https://join.com', 'Welcome!');
            expect(html).toContain('Welcome!');
        });
    });

    describe('listTemplates', () => {
        test('has 7 templates', () => {
            expect(engine.listTemplates().length).toBe(7);
        });
    });

    describe('preview', () => {
        test('previews password_reset', () => {
            expect(engine.preview('password_reset')).toContain('John Doe');
        });

        test('returns null for unknown template', () => {
            expect(engine.preview('nonexistent')).toBeNull();
        });
    });
});
