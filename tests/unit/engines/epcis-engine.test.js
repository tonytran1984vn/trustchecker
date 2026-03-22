const epcis = require('../../../server/engines/core/epcis-engine');

describe('EpcisEngine', () => {
    describe('getAction', () => {
        test('commission → ADD', () => expect(epcis.getAction('commission')).toBe('ADD'));
        test('destroy → DELETE', () => expect(epcis.getAction('destroy')).toBe('DELETE'));
        test('sell → DELETE', () => expect(epcis.getAction('sell')).toBe('DELETE'));
        test('return → DELETE', () => expect(epcis.getAction('return')).toBe('DELETE'));
        test('ship → OBSERVE', () => expect(epcis.getAction('ship')).toBe('OBSERVE'));
        test('unknown → OBSERVE', () => expect(epcis.getAction('xyz')).toBe('OBSERVE'));
    });

    describe('buildEPC', () => {
        test('builds EPC URN from SKU', () => {
            const epc = epcis.buildEPC('SKU-001');
            expect(epc).toContain('urn:epc:id:sgtin:trustchecker.');
            expect(epc).toContain('SKU001');
        });

        test('includes batch number', () => {
            const epc = epcis.buildEPC('SKU-001', 'BATCH-A1');
            expect(epc).toContain('BATCHA1');
        });

        test('strips special characters', () => {
            const epc = epcis.buildEPC('SKU/001@test');
            expect(epc).not.toContain('/');
            expect(epc).not.toContain('@');
        });
    });

    describe('buildDigitalLink', () => {
        test('returns GS1 Digital Link URI', () => {
            const link = epcis.buildDigitalLink('12345678901234', 'SER001');
            expect(link).toContain('https://id.gs1.org/01/');
            expect(link).toContain('/21/SER001');
        });

        test('pads short SKU to 14 digits', () => {
            const link = epcis.buildDigitalLink('123', 'S1');
            expect(link).toMatch(/\/01\/\d{14}\//);
        });
    });

    describe('hashEvent', () => {
        test('returns SHA-256 hex', () => {
            const hash = epcis.hashEvent({ type: 'ObjectEvent', action: 'ADD' });
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('deterministic', () => {
            const evt = { type: 'ObjectEvent', action: 'ADD' };
            expect(epcis.hashEvent(evt)).toBe(epcis.hashEvent(evt));
        });
    });

    describe('hashDocument', () => {
        test('returns hash of combined event hashes', () => {
            const events = [
                { 'trustchecker:eventHash': 'abc' },
                { 'trustchecker:eventHash': 'def' },
            ];
            const hash = epcis.hashDocument(events);
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('toEpcisEvent', () => {
        test('converts commission event', () => {
            const event = { id: 'e1', event_type: 'commission', created_at: '2024-01-15T10:00:00Z' };
            const product = { sku: 'SKU001' };
            const result = epcis.toEpcisEvent(event, product);
            expect(result.type).toBe('ObjectEvent');
            expect(result.action).toBe('ADD');
            expect(result.bizStep).toContain('commissioning');
            expect(result['trustchecker:eventHash']).toBeDefined();
        });

        test('converts ship event with partner', () => {
            const event = { id: 'e2', event_type: 'ship', partner_id: 'partner1' };
            const partner = { id: 'partner1' };
            const result = epcis.toEpcisEvent(event, null, partner);
            expect(result.sourceList).toBeDefined();
        });

        test('adds blockchain ILMD', () => {
            const event = { id: 'e3', event_type: 'commission', blockchain_seal_id: 'seal-1' };
            const result = epcis.toEpcisEvent(event);
            expect(result.ilmd['trustchecker:blockchainSealId']).toBe('seal-1');
        });

        test('adds sensor data for IoT events', () => {
            const event = { id: 'e4', event_type: 'ship', details: JSON.stringify({ temperature: 4.5, humidity: 60 }) };
            const result = epcis.toEpcisEvent(event);
            expect(result.sensorElementList).toBeDefined();
            expect(result.sensorElementList[0].sensorReport.length).toBe(2);
        });
    });

    describe('toEpcisDocument', () => {
        test('creates full EPCISDocument', () => {
            const events = [{ id: 'e1', event_type: 'commission', product_id: 'p1' }];
            const products = [{ id: 'p1', sku: 'SKU1' }];
            const doc = epcis.toEpcisDocument(events, products);
            expect(doc.type).toBe('EPCISDocument');
            expect(doc.schemaVersion).toBe('2.0');
            expect(doc.epcisBody.eventList.length).toBe(1);
            expect(doc['trustchecker:metadata'].totalEvents).toBe(1);
        });
    });

    describe('fromEpcisEvent', () => {
        test('parses EPCIS event to internal format', () => {
            const epcisEvent = {
                bizStep: 'https://ref.gs1.org/cbv/BizStep-shipping',
                eventTime: '2024-01-15T10:00:00Z',
                eventID: 'urn:uuid:abc',
                action: 'OBSERVE',
                epcList: ['urn:epc:id:sgtin:test.123'],
            };
            const result = epcis.fromEpcisEvent(epcisEvent);
            expect(result.event_type).toBe('ship');
            expect(result.actor).toBe('epcis_import');
        });

        test('defaults to commission for unknown bizStep', () => {
            const result = epcis.fromEpcisEvent({ bizStep: 'unknown' });
            expect(result.event_type).toBe('commission');
        });
    });

    describe('queryEvents', () => {
        const events = [
            { type: 'ObjectEvent', bizStep: 'shipping', action: 'OBSERVE', eventTime: '2024-01-10T10:00:00Z', epcList: ['urn:test.abc'] },
            { type: 'ObjectEvent', bizStep: 'receiving', action: 'OBSERVE', eventTime: '2024-01-15T10:00:00Z', epcList: ['urn:test.def'] },
            { type: 'AggregationEvent', bizStep: 'packing', action: 'ADD', eventTime: '2024-01-12T10:00:00Z', epcList: ['urn:test.abc'] },
        ];

        test('filters by eventType', () => {
            const r = epcis.queryEvents(events, { eventType: 'AggregationEvent' });
            expect(r.length).toBe(1);
        });

        test('filters by bizStep', () => {
            const r = epcis.queryEvents(events, { bizStep: 'shipping' });
            expect(r.length).toBe(1);
        });

        test('filters by GE_eventTime', () => {
            const r = epcis.queryEvents(events, { GE_eventTime: '2024-01-12T00:00:00Z' });
            expect(r.length).toBe(2);
        });

        test('filters by LT_eventTime', () => {
            const r = epcis.queryEvents(events, { LT_eventTime: '2024-01-12T00:00:00Z' });
            expect(r.length).toBe(1);
        });

        test('filters by EQ_action', () => {
            const r = epcis.queryEvents(events, { EQ_action: 'ADD' });
            expect(r.length).toBe(1);
        });

        test('filters by MATCH_epc', () => {
            const r = epcis.queryEvents(events, { MATCH_epc: 'abc' });
            expect(r.length).toBe(2);
        });

        test('returns all without filters', () => {
            expect(epcis.queryEvents(events, {}).length).toBe(3);
        });
    });
});
