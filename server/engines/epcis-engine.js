/**
 * TrustChecker EPCIS 2.0 Engine
 * GS1 EPCIS 2.0 JSON-LD compliant event transformation
 * Maps internal SCM events to EPCIS standard format
 * 
 * References:
 * - GS1 EPCIS 2.0: https://ref.gs1.org/standards/epcis/
 * - CBV 2.0: https://ref.gs1.org/cbv/
 */

const crypto = require('crypto');

const EPCIS_CONTEXT = 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld';
const CBV_NS = 'https://ref.gs1.org/cbv/';

// ─── Core Business Vocabulary (CBV) Mappings ──────────────────────────────────
const BIZ_STEP_MAP = {
    'commission': `${CBV_NS}BizStep-commissioning`,
    'pack': `${CBV_NS}BizStep-packing`,
    'ship': `${CBV_NS}BizStep-shipping`,
    'receive': `${CBV_NS}BizStep-receiving`,
    'sell': `${CBV_NS}BizStep-retail_selling`,
    'inspect': `${CBV_NS}BizStep-inspecting`,
    'store': `${CBV_NS}BizStep-storing`,
    'transform': `${CBV_NS}BizStep-transforming`,
    'destroy': `${CBV_NS}BizStep-destroying`,
    'return': `${CBV_NS}BizStep-returning`,
    'recall': `${CBV_NS}BizStep-returning`,
    'transit': `${CBV_NS}BizStep-transporting`,
};

const DISPOSITION_MAP = {
    'commission': `${CBV_NS}Disp-active`,
    'ship': `${CBV_NS}Disp-in_transit`,
    'receive': `${CBV_NS}Disp-in_progress`,
    'sell': `${CBV_NS}Disp-retail_sold`,
    'return': `${CBV_NS}Disp-returned`,
    'recall': `${CBV_NS}Disp-recalled`,
    'destroy': `${CBV_NS}Disp-destroyed`,
};

const EVENT_TYPE_MAP = {
    'commission': 'ObjectEvent',
    'pack': 'AggregationEvent',
    'ship': 'ObjectEvent',
    'receive': 'ObjectEvent',
    'sell': 'ObjectEvent',
    'transform': 'TransformationEvent',
    'return': 'ObjectEvent',
    'recall': 'ObjectEvent',
    'transit': 'ObjectEvent',
};

class EpcisEngine {
    /**
     * Convert internal SCM event to EPCIS 2.0 JSON-LD event
     */
    toEpcisEvent(event, product = null, partner = null, batch = null) {
        const epcisType = EVENT_TYPE_MAP[event.event_type] || 'ObjectEvent';
        const eventTime = event.created_at || new Date().toISOString();
        const eventTimeZone = '+07:00'; // Vietnam timezone default

        // Build EPC list (Electronic Product Code)
        const epcList = [];
        if (product?.sku) {
            epcList.push(this.buildEPC(product.sku, batch?.batch_number));
        }
        if (batch?.batch_number) {
            epcList.push(`urn:epc:id:sgtin:trustchecker.${batch.batch_number}`);
        }
        if (epcList.length === 0) {
            epcList.push(`urn:epc:id:sgtin:trustchecker.${event.id}`);
        }

        const epcisEvent = {
            type: epcisType,
            eventTime,
            eventTimeZoneOffset: eventTimeZone,
            eventID: `urn:uuid:${event.id}`,
            epcList: epcIsObjectOrTransaction(epcisType) ? epcList : undefined,
            action: this.getAction(event.event_type),
            bizStep: BIZ_STEP_MAP[event.event_type] || `${CBV_NS}BizStep-other`,
            disposition: DISPOSITION_MAP[event.event_type] || `${CBV_NS}Disp-active`,
            readPoint: event.location ? { id: `urn:epc:id:sgln:trustchecker.${sanitizeLocationId(event.location)}` } : undefined,
            bizLocation: partner ? { id: `urn:epc:id:sgln:trustchecker.${partner.id}` } : undefined,
        };

        // Add source/destination for shipping events
        if (event.event_type === 'ship' || event.event_type === 'receive') {
            epcisEvent.sourceList = event.partner_id ? [
                { type: `${CBV_NS}SDT-possessing_party`, source: `urn:epc:id:pgln:trustchecker.${event.partner_id}` }
            ] : undefined;
        }

        // Add blockchain seal reference as ILMD (Instance/Lot Master Data)
        if (event.blockchain_seal_id) {
            epcisEvent.ilmd = {
                'trustchecker:blockchainSealId': event.blockchain_seal_id,
                'trustchecker:integrityVerified': true
            };
        }

        // Add sensor data for IoT-enabled events
        if (event.details) {
            try {
                const details = typeof event.details === 'string' ? JSON.parse(event.details) : event.details;
                if (details.temperature || details.humidity) {
                    epcisEvent.sensorElementList = [{
                        sensorReport: []
                    }];
                    if (details.temperature) {
                        epcisEvent.sensorElementList[0].sensorReport.push({
                            type: 'Temperature',
                            value: details.temperature,
                            uom: 'CEL',
                            time: eventTime
                        });
                    }
                    if (details.humidity) {
                        epcisEvent.sensorElementList[0].sensorReport.push({
                            type: 'RelativeHumidity',
                            value: details.humidity,
                            uom: 'P1',
                            time: eventTime
                        });
                    }
                }
            } catch { /* ignore parse errors */ }
        }

        // Generate integrity hash
        epcisEvent['trustchecker:eventHash'] = this.hashEvent(epcisEvent);

        return epcisEvent;
    }

    /**
     * Generate full EPCISDocument JSON-LD
     */
    toEpcisDocument(events, products = [], partners = [], batches = []) {
        const productMap = {};
        products.forEach(p => { productMap[p.id] = p; });
        const partnerMap = {};
        partners.forEach(p => { partnerMap[p.id] = p; });
        const batchMap = {};
        batches.forEach(b => { batchMap[b.id] = b; });

        const epcisEvents = events.map(e =>
            this.toEpcisEvent(
                e,
                productMap[e.product_id],
                partnerMap[e.partner_id],
                batchMap[e.batch_id]
            )
        );

        return {
            '@context': [
                EPCIS_CONTEXT,
                {
                    'trustchecker': 'https://trustchecker.io/ns/',
                    'gs1': 'https://gs1.org/voc/'
                }
            ],
            type: 'EPCISDocument',
            schemaVersion: '2.0',
            creationDate: new Date().toISOString(),
            sender: {
                'type': 'Organization',
                'id': 'urn:epc:id:pgln:trustchecker',
                'name': 'TrustChecker Platform'
            },
            epcisBody: {
                eventList: epcisEvents
            },
            'trustchecker:metadata': {
                totalEvents: epcisEvents.length,
                generatedAt: new Date().toISOString(),
                version: 'TrustChecker EPCIS Engine v1.0',
                integrityHash: this.hashDocument(epcisEvents)
            }
        };
    }

    /**
     * Parse incoming EPCIS event to internal format
     */
    fromEpcisEvent(epcisEvent) {
        // Reverse CBV bizStep to internal event type
        let eventType = 'commission';
        for (const [key, value] of Object.entries(BIZ_STEP_MAP)) {
            if (epcisEvent.bizStep === value) {
                eventType = key;
                break;
            }
        }

        return {
            event_type: eventType,
            location: epcisEvent.readPoint?.id?.replace(/^urn:epc:id:sgln:trustchecker\./, '') || '',
            actor: 'epcis_import',
            details: JSON.stringify({
                epcis_source: true,
                original_event_id: epcisEvent.eventID,
                epc_list: epcisEvent.epcList || [],
                action: epcisEvent.action,
                disposition: epcisEvent.disposition,
                sensor_data: epcisEvent.sensorElementList || []
            }),
            created_at: epcisEvent.eventTime
        };
    }

    /**
     * GS1 Digital Link URI for product
     */
    buildDigitalLink(sku, serial) {
        const gtin = sku.replace(/[^a-zA-Z0-9]/g, '').padStart(14, '0').substring(0, 14);
        return `https://id.gs1.org/01/${gtin}/21/${serial || '0'}`;
    }

    /**
     * Build EPC URN
     */
    buildEPC(sku, batchNumber) {
        const cleaned = sku.replace(/[^a-zA-Z0-9]/g, '');
        return `urn:epc:id:sgtin:trustchecker.${cleaned}${batchNumber ? `.${batchNumber.replace(/[^a-zA-Z0-9]/g, '')}` : ''}`;
    }

    /**
     * Get EPCIS Action based on event type
     */
    getAction(eventType) {
        switch (eventType) {
            case 'commission': return 'ADD';
            case 'destroy': case 'sell': return 'DELETE';
            case 'return': case 'recall': return 'DELETE';
            default: return 'OBSERVE';
        }
    }

    /**
     * Hash an EPCIS event for integrity verification
     */
    hashEvent(event) {
        const canonical = JSON.stringify(event, Object.keys(event).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    /**
     * Hash entire document for integrity
     */
    hashDocument(events) {
        const hashes = events.map(e => e['trustchecker:eventHash'] || this.hashEvent(e));
        return crypto.createHash('sha256').update(hashes.join(':')).digest('hex');
    }

    /**
     * EPCIS SimpleEventQuery
     */
    queryEvents(events, filters = {}) {
        let result = [...events];

        if (filters.eventType) {
            result = result.filter(e => e.type === filters.eventType);
        }
        if (filters.bizStep) {
            result = result.filter(e => e.bizStep === filters.bizStep);
        }
        if (filters.GE_eventTime) {
            const threshold = new Date(filters.GE_eventTime).getTime();
            result = result.filter(e => new Date(e.eventTime).getTime() >= threshold);
        }
        if (filters.LT_eventTime) {
            const threshold = new Date(filters.LT_eventTime).getTime();
            result = result.filter(e => new Date(e.eventTime).getTime() < threshold);
        }
        if (filters.EQ_action) {
            result = result.filter(e => e.action === filters.EQ_action);
        }
        if (filters.EQ_disposition) {
            result = result.filter(e => e.disposition === filters.EQ_disposition);
        }
        if (filters.MATCH_epc) {
            const pattern = filters.MATCH_epc;
            result = result.filter(e =>
                (e.epcList || []).some(epc => epc.includes(pattern))
            );
        }

        return result;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function epcIsObjectOrTransaction(type) {
    return type === 'ObjectEvent' || type === 'TransactionEvent';
}

function sanitizeLocationId(location) {
    return (location || '').replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

module.exports = new EpcisEngine();
