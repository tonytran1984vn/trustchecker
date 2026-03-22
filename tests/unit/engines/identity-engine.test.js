const identity = require('../../../server/engines/infrastructure/identity-engine');
const IDClass = identity.constructor;

let engine;
beforeEach(() => { engine = new IDClass(); });

describe('IdentityEngine', () => {
    describe('generateDID', () => {
        test('generates DID for product', () => {
            const r = engine.generateDID('product', 'P001', 'org-1');
            expect(r.did).toBe('did:tc:product:org-1:P001');
            expect(r.did_document.id).toBe(r.did);
        });

        test('generates DID for partner', () => {
            const r = engine.generateDID('partner', 'X1', 'org-1');
            expect(r.did).toContain('partner');
        });

        test('invalid entity type returns error', () => {
            const r = engine.generateDID('invalid_type', 'X1');
            expect(r.error).toBeDefined();
        });

        test('includes W3C DID context', () => {
            const r = engine.generateDID('company', 'C1');
            expect(r.did_document['@context']).toContain('https://www.w3.org/ns/did/v1');
        });

        test('generates unique key pair', () => {
            const r1 = engine.generateDID('product', 'P1');
            const r2 = engine.generateDID('product', 'P2');
            expect(r1.keys.publicKey).not.toBe(r2.keys.publicKey);
        });

        test('has authentication and assertion methods', () => {
            const r = engine.generateDID('factory', 'F1');
            expect(r.did_document.authentication.length).toBe(1);
            expect(r.did_document.assertionMethod.length).toBe(1);
        });

        test('has 2 service endpoints', () => {
            const r = engine.generateDID('device', 'D1');
            expect(r.did_document.service.length).toBe(2);
        });
    });

    describe('resolveDID', () => {
        test('resolves stored DID document', () => {
            const gen = engine.generateDID('product', 'P1');
            const r = engine.resolveDID(gen.did, gen);
            expect(r.didDocument).toBeDefined();
        });

        test('rejects invalid DID method', () => {
            expect(engine.resolveDID('did:web:example', {}).error).toBeDefined();
        });

        test('rejects missing document', () => {
            expect(engine.resolveDID('did:tc:product:o:x', null).error).toBeDefined();
        });
    });

    describe('issueVC', () => {
        test('issues ISO_14001 credential', () => {
            const r = engine.issueVC({
                issuer_did: 'did:tc:company:o:root',
                subject_did: 'did:tc:product:o:P1',
                credential_type: 'ISO_14001',
            });
            expect(r.vc_id).toContain('urn:tc:vc:');
            expect(r.credential.type).toContain('ISO_14001');
        });

        test('unknown credential type returns error', () => {
            const r = engine.issueVC({ credential_type: 'FAKE' });
            expect(r.error).toBeDefined();
        });

        test('credential has proof', () => {
            const r = engine.issueVC({
                issuer_did: 'did:tc:company:o:root',
                subject_did: 'did:tc:product:o:P1',
                credential_type: 'ESG_GRADE',
            });
            expect(r.credential.proof.type).toBe('Ed25519Signature2020');
        });

        test('expiration date matches validity days', () => {
            const r = engine.issueVC({
                issuer_did: 'did:tc:company:o:root',
                subject_did: 'did:tc:product:o:P1',
                credential_type: 'LOW_CARBON',
            });
            expect(r.metadata.validity_days).toBe(30);
        });
    });

    describe('verifyVC', () => {
        test('verifies valid VC', () => {
            const issued = engine.issueVC({
                issuer_did: 'did:tc:company:o:root',
                subject_did: 'did:tc:product:o:P1',
                credential_type: 'TRUST_VERIFIED',
            });
            const r = engine.verifyVC(issued.credential);
            expect(r.valid).toBe(true);
            expect(r.checks.passed).toBe(r.checks.total);
        });

        test('detects missing proof', () => {
            const r = engine.verifyVC({ '@context': ['https://www.w3.org/2018/credentials/v1'], type: ['VerifiableCredential'], issuer: 'test', credentialSubject: { id: 'x' } });
            expect(r.valid).toBe(false);
        });

        test('detects expired credential', () => {
            const r = engine.verifyVC({
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                expirationDate: '2020-01-01',
                proof: { proofValue: 'test' },
                issuer: 'x',
                credentialSubject: { id: 'y' }
            });
            expect(r.valid).toBe(false);
        });
    });

    describe('revokeVC', () => {
        test('revokes credential', () => {
            const r = engine.revokeVC('urn:tc:vc:test', 'admin', 'Policy update');
            expect(r.status).toBe('revoked');
        });
    });

    describe('buildTrustChain', () => {
        test('builds chain with credentials', () => {
            const vc = engine.issueVC({ issuer_did: 'i', subject_did: 'did:tc:product:o:P1', credential_type: 'ISO_14001' });
            const r = engine.buildTrustChain('did:tc:product:o:P1', [vc]);
            expect(r.credentials_count).toBe(1);
            expect(r.trust_score).toBeGreaterThan(0);
        });

        test('trust grade reflects score', () => {
            const vcs = ['ISO_14001', 'ISO_9001', 'ESG_GRADE', 'TRUST_VERIFIED', 'ORGANIC', 'FAIR_TRADE'].map(t =>
                engine.issueVC({ issuer_did: 'i', subject_did: 'did:tc:product:o:P1', credential_type: t })
            );
            const r = engine.buildTrustChain('did:tc:product:o:P1', vcs, [{ did: 'd', entity_type: 'partner' }]);
            expect(r.trust_grade).toBe('A');
        });
    });

    describe('getters', () => {
        test('has 8 entity types', () => {
            expect(engine.getEntityTypes().length).toBe(8);
        });

        test('has 10 VC types', () => {
            expect(Object.keys(engine.getVCTypes()).length).toBe(10);
        });
    });
});
