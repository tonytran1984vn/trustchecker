jest.mock('../../../server/db', () => require('../../helpers/db-mock'));

const db = require('../../../server/db');
const scoreEngine = require('../../../server/engines/core/score-validation-engine');

beforeEach(() => db.__resetMocks());

describe('ScoreValidationEngine', () => {
    describe('recordPrediction', () => {
        test('inserts prediction and returns id', async () => {
            db.all.mockResolvedValueOnce([{ id: 'sv-1' }]);
            const result = await scoreEngine.recordPrediction('org-1', 'supplier', 'sup-1', 85, 'low');
            expect(db.all).toHaveBeenCalled();
            expect(result.id).toBe('sv-1');
        });
    });

    describe('validateOutcome', () => {
        test('updates prediction with outcome', async () => {
            db.all.mockResolvedValueOnce([{ id: 'sv-1', predicted_score: 85, actual_outcome: 'compliant' }]);
            const result = await scoreEngine.validateOutcome('sv-1', 'compliant', 'user-1');
            expect(db.all).toHaveBeenCalled();
            expect(result.id).toBe('sv-1');
        });
    });

    describe('autoValidateFromIncident', () => {
        test('updates matching pending predictions', async () => {
            db.all.mockResolvedValueOnce([{ id: 'sv-1' }, { id: 'sv-2' }]);
            const result = await scoreEngine.autoValidateFromIncident('org-1', 'supplier', 'sup-1');
            expect(result).toHaveLength(2);
        });
    });

    describe('getAccuracyMetrics', () => {
        test('calculates precision/recall/F1', async () => {
            db.all.mockResolvedValueOnce([{
                entity_type: 'supplier',
                total_validations: '100',
                validated_count: '80',
                avg_accuracy_delta: '0.15',
                true_positives: '30',
                false_positives: '10',
                false_negatives: '5',
                true_negatives: '35',
            }]);
            const result = await scoreEngine.getAccuracyMetrics('org-1');
            expect(result[0].entity_type).toBe('supplier');
            expect(result[0].precision).toBeCloseTo(0.75);
            expect(result[0].recall).toBeCloseTo(0.857, 2);
            expect(result[0].f1_score).toBeGreaterThan(0);
        });

        test('handles zero counts (null precision/recall)', async () => {
            db.all.mockResolvedValueOnce([{
                entity_type: 'product',
                total_validations: '10',
                validated_count: '0',
                avg_accuracy_delta: null,
                true_positives: '0',
                false_positives: '0',
                false_negatives: '0',
                true_negatives: '0',
            }]);
            const result = await scoreEngine.getAccuracyMetrics('org-1');
            expect(result[0].precision).toBeNull();
            expect(result[0].recall).toBeNull();
            expect(result[0].f1_score).toBeNull();
        });
    });

    describe('getPendingValidations', () => {
        test('returns pending validations', async () => {
            db.all.mockResolvedValueOnce([{ id: 'sv-1', validation_status: 'pending' }]);
            const result = await scoreEngine.getPendingValidations('org-1');
            expect(result).toHaveLength(1);
        });

        test('defaults limit to 50', async () => {
            db.all.mockResolvedValueOnce([]);
            await scoreEngine.getPendingValidations('org-1');
            expect(db.all.mock.calls[0][1]).toContain(50);
        });

        test('respects custom limit', async () => {
            db.all.mockResolvedValueOnce([]);
            await scoreEngine.getPendingValidations('org-1', 10);
            expect(db.all.mock.calls[0][1]).toContain(10);
        });
    });

    describe('_outcomeToScore', () => {
        test('maps incident to 0.0', () => {
            expect(scoreEngine._outcomeToScore('incident')).toBe(0.0);
        });

        test('maps compliant to 0.8', () => {
            expect(scoreEngine._outcomeToScore('compliant')).toBe(0.8);
        });

        test('maps no_incident to 1.0', () => {
            expect(scoreEngine._outcomeToScore('no_incident')).toBe(1.0);
        });

        test('maps unknown to 0.5', () => {
            expect(scoreEngine._outcomeToScore('unknown_outcome')).toBe(0.5);
        });

        test('maps fraud to 0.0', () => {
            expect(scoreEngine._outcomeToScore('fraud')).toBe(0.0);
        });

        test('maps warning to 0.4', () => {
            expect(scoreEngine._outcomeToScore('warning')).toBe(0.4);
        });
    });
});
