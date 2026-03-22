const ai = require('../../../server/engines/infrastructure/ai-assistant');
const AIClass = ai.constructor;

let engine;
beforeEach(() => { engine = new AIClass(); });

describe('AIAssistant', () => {
    describe('respond - greetings', () => {
        test('responds to hello', () => {
            const r = engine.respond('hello');
            expect(r.category).toBe('greeting');
            expect(r.confidence).toBe(1.0);
        });

        test('responds to hi', () => {
            expect(engine.respond('hi there').category).toBe('greeting');
        });

        test('responds to xin chào', () => {
            expect(engine.respond('xin chào').category).toBe('greeting');
        });
    });

    describe('respond - thanks', () => {
        test('responds to thanks', () => {
            expect(engine.respond('thanks a lot').category).toBe('thanks');
        });

        test('responds to cảm ơn', () => {
            expect(engine.respond('cảm ơn nhiều').category).toBe('thanks');
        });
    });

    describe('respond - knowledge base', () => {
        test('matches trust score topic', () => {
            const r = engine.respond('what is a trust score');
            expect(r.category).toBe('trust');
            expect(r.matched_topic).toBe('trust score');
        });

        test('matches fraud topic', () => {
            expect(engine.respond('tell me about fraud detection').category).toBe('fraud');
        });

        test('matches billing topic', () => {
            expect(engine.respond('whats my billing plan').category).toBe('billing');
        });

        test('matches blockchain topic', () => {
            expect(engine.respond('how does blockchain work').category).toBe('blockchain');
        });

        test('matches supply chain topic', () => {
            expect(engine.respond('tell me about supply chain').category).toBe('scm');
        });

        test('matches QR code topic', () => {
            expect(engine.respond('qr code scanning').category).toBe('scanning');
        });

        test('matches MFA topic', () => {
            expect(engine.respond('how to enable mfa').category).toBe('security');
        });

        test('matches GDPR topic', () => {
            expect(engine.respond('gdpr compliance data').category).toBe('compliance');
        });

        test('matches evidence topic', () => {
            expect(engine.respond('evidence vault documents').category).toBe('evidence');
        });

        test('returns suggestions for related topics', () => {
            const r = engine.respond('trust score');
            expect(r.suggestions.length).toBeGreaterThan(0);
        });
    });

    describe('respond - context-aware fallback', () => {
        test('dashboard context', () => {
            const r = engine.respond('whats this', { current_page: '/dashboard' });
            expect(r.category).toBe('contextual');
        });

        test('fraud-center context', () => {
            const r = engine.respond('whats this', { current_page: '/fraud-center' });
            expect(r.category).toBe('contextual');
        });
    });

    describe('respond - unknown', () => {
        test('returns unknown for gibberish', () => {
            const r = engine.respond('asdfghjkl random nonsense');
            expect(r.category).toBe('unknown');
            expect(r.confidence).toBe(0);
        });
    });

    describe('getSuggestions', () => {
        test('returns base suggestions', () => {
            const r = engine.getSuggestions();
            expect(r.length).toBe(4);
        });

        test('admin gets extra suggestions', () => {
            const r = engine.getSuggestions({ role: 'admin' });
            expect(r.length).toBe(6);
        });
    });
});
