/**
 * Seed Ops Data — Complete seed for all Ops workspace pages
 * Purchase Orders, Warehouses, Quality Checks, Demand Forecasts,
 * Incidents, Activity Log, Scan Events, Fraud Alerts, Anomaly Detections
 * Run: node server/seed-ops-data.js
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Use the Demo Corp org or first available
async function getOrgId() {
    const org = await prisma.organization.findFirst({ where: { slug: 'demo-corp' } });
    if (org) return org.id;
    const any = await prisma.organization.findFirst();
    return any?.id || 'default-org';
}

async function seed() {
    const orgId = await getOrgId();
    console.log(`[seed-ops] Using orgId: ${orgId}`);

    // Get a user for actor references
    const opsUser = await prisma.user.findFirst({ where: { email: 'ops@tonyisking.com' } });
    const opsUserId = opsUser?.id || null;

    // ═══ PURCHASE ORDERS ═══
    const PO_DATA = [
        { poNumber: 'PO-2026-0451', supplier: 'Golden Beans Co. (VN)', product: 'Arabica Coffee Raw', quantity: 50000, unit: 'kg', unitPrice: 4.20, totalAmount: 210000, deliveryDate: new Date('2026-03-05'), paymentTerms: 'NET-30', contractRef: 'MC-2025-012', status: 'approved' },
        { poNumber: 'PO-2026-0450', supplier: 'Ceylon Leaf Ltd (LK)', product: 'Organic Green Tea', quantity: 20000, unit: 'kg', unitPrice: 8.50, totalAmount: 170000, deliveryDate: new Date('2026-03-12'), paymentTerms: 'LC', contractRef: 'MC-2025-008', status: 'in_transit' },
        { poNumber: 'PO-2026-0449', supplier: 'NZ Manuka Inc (NZ)', product: 'Manuka Honey UMF15+', quantity: 5000, unit: 'kg', unitPrice: 45.00, totalAmount: 225000, deliveryDate: new Date('2026-03-20'), paymentTerms: 'TT', contractRef: 'MC-2025-015', status: 'pending_approval' },
        { poNumber: 'PO-2026-0448', supplier: 'Pacific Pack (TH)', product: 'Premium Gift Box', quantity: 100000, unit: 'pcs', unitPrice: 1.80, totalAmount: 180000, deliveryDate: new Date('2026-02-28'), paymentTerms: 'NET-45', contractRef: 'MC-2025-020', status: 'delivered' },
        { poNumber: 'PO-2026-0445', supplier: 'Golden Beans Co. (VN)', product: 'Robusta Coffee Raw', quantity: 30000, unit: 'kg', unitPrice: 2.80, totalAmount: 84000, deliveryDate: new Date('2026-02-25'), paymentTerms: 'NET-30', contractRef: 'MC-2025-012', status: 'delivered' },
        { poNumber: 'PO-2026-0442', supplier: 'Vietnam Spice (VN)', product: 'Cinnamon Sticks Grade A', quantity: 8000, unit: 'kg', unitPrice: 12.00, totalAmount: 96000, deliveryDate: new Date('2026-03-15'), paymentTerms: 'NET-30', contractRef: 'MC-2025-025', status: 'approved' },
        { poNumber: 'PO-2026-0440', supplier: 'Eco Paper (SG)', product: 'Biodegradable Pouch 250g', quantity: 200000, unit: 'pcs', unitPrice: 0.35, totalAmount: 70000, deliveryDate: new Date('2026-03-08'), paymentTerms: 'NET-60', contractRef: 'MC-2025-030', status: 'draft' },
    ];

    for (const po of PO_DATA) {
        await prisma.purchaseOrder.upsert({
            where: { poNumber: po.poNumber },
            update: { ...po, orgId },
            create: { id: uuidv4(), ...po, orgId },
        });
    }
    console.log(`[seed-ops] ${PO_DATA.length} purchase orders seeded`);

    // ═══ WAREHOUSES ═══
    const WH_DATA = [
        { code: 'WH-HCM-01', name: 'Ho Chi Minh DC', region: 'VN-South', capacity: 50000, usedCapacity: 38500, skuCount: 45, temperature: 22, status: 'operational' },
        { code: 'WH-HN-02', name: 'Hanoi Warehouse', region: 'VN-North', capacity: 30000, usedCapacity: 24200, skuCount: 38, temperature: 20, status: 'operational' },
        { code: 'WH-SG-01', name: 'Singapore Hub', region: 'APAC', capacity: 80000, usedCapacity: 52000, skuCount: 52, temperature: 18, status: 'operational' },
        { code: 'WH-BKK-01', name: 'Bangkok Transit', region: 'ASEAN', capacity: 20000, usedCapacity: 14100, skuCount: 22, temperature: 25, status: 'maintenance' },
    ];

    for (const wh of WH_DATA) {
        const existing = await prisma.opsWarehouse.findFirst({ where: { code: wh.code, orgId } });
        if (!existing) {
            await prisma.opsWarehouse.create({ data: { id: uuidv4(), orgId, ...wh } });
        } else {
            await prisma.opsWarehouse.update({ where: { id: existing.id }, data: wh });
        }
    }
    console.log(`[seed-ops] ${WH_DATA.length} warehouses seeded`);

    // ═══ QUALITY CHECKS ═══
    const QC_DATA = [
        { checkType: 'incoming', checkpoint: 'Raw Material Inspection', product: 'Arabica Coffee Raw', result: 'pass', score: 97, defectsFound: 0, inspector: 'QC Team A', notes: 'Moisture content 11.2% — within spec' },
        { checkType: 'in_process', checkpoint: 'Roasting Temperature', product: 'Premium Roast Blend', result: 'pass', score: 94, defectsFound: 1, inspector: 'QC Team B', notes: 'Minor color variance on batch 3' },
        { checkType: 'final', checkpoint: 'Packaging Seal Test', product: 'Gift Box Assortment', result: 'pass', score: 100, defectsFound: 0, inspector: 'QC Team A', notes: 'All seals intact, vacuum test passed' },
        { checkType: 'incoming', checkpoint: 'Lab Analysis', product: 'Manuka Honey UMF15+', result: 'hold', score: 78, defectsFound: 2, inspector: 'Lab Team', notes: 'UMF reading 14.8 — borderline, retesting required' },
        { checkType: 'final', checkpoint: 'Weight Verification', product: 'Noodle RC 400g', result: 'fail', score: 45, defectsFound: 8, inspector: 'QC Team C', notes: '8 units underweight (<395g) — batch held' },
        { checkType: 'incoming', checkpoint: 'Visual Inspection', product: 'Organic Green Tea', result: 'pass', score: 92, defectsFound: 0, inspector: 'QC Team B', notes: 'Leaf quality grade A, no foreign particles' },
    ];

    const existingQC = await prisma.qualityCheck.count({ where: { orgId } });
    if (existingQC < QC_DATA.length) {
        for (const qc of QC_DATA) {
            await prisma.qualityCheck.create({ data: { id: uuidv4(), orgId, ...qc } });
        }
        console.log(`[seed-ops] ${QC_DATA.length} quality checks seeded`);
    } else {
        console.log(`[seed-ops] Quality checks already seeded (${existingQC} existing)`);
    }

    // ═══ DEMAND FORECASTS ═══
    const DF_DATA = [
        { productName: 'Arabica Coffee Raw', period: '2026-Q1', predicted: 85000, confidence: 0.92, trend: 'increasing', signal: 'Strong Lunar New Year demand' },
        { productName: 'Organic Green Tea', period: '2026-Q1', predicted: 32000, confidence: 0.87, trend: 'stable', signal: 'Seasonal baseline' },
        { productName: 'Manuka Honey UMF15+', period: '2026-Q1', predicted: 8000, confidence: 0.78, trend: 'increasing', signal: 'Health trend surge +15%' },
        { productName: 'Premium Gift Box', period: '2026-Q1', predicted: 150000, confidence: 0.95, trend: 'spike', signal: 'Tet holiday peak' },
        { productName: 'Robusta Coffee Raw', period: '2026-Q1', predicted: 45000, confidence: 0.88, trend: 'decreasing', signal: 'Market shift to Arabica' },
        { productName: 'Noodle RC 400g', period: '2026-Q1', predicted: 60000, confidence: 0.90, trend: 'stable', signal: 'Consistent retail demand' },
        { productName: 'GPS Tracker Mini', period: '2026-Q1', predicted: 5000, confidence: 0.72, trend: 'increasing', signal: 'New partnership channel' },
    ];

    const existingDF = await prisma.demandForecast.count({ where: { orgId } });
    if (existingDF < DF_DATA.length) {
        for (const df of DF_DATA) {
            await prisma.demandForecast.create({ data: { id: uuidv4(), orgId, ...df } });
        }
        console.log(`[seed-ops] ${DF_DATA.length} demand forecasts seeded`);
    } else {
        console.log(`[seed-ops] Demand forecasts already seeded (${existingDF} existing)`);
    }

    // ═══ INCIDENTS (ops_incidents_v2) ═══
    const INC_DATA = [
        // Open incidents
        { incidentId: 'INC-OPS-0045', title: 'Batch B-2026-0888 contamination risk', description: 'Lab detected trace contaminants in batch B-2026-0888 raw material sample. Batch held pending retesting.', severity: 'SEV1', status: 'open', module: 'quality', affectedEntity: 'B-2026-0888', assignedTo: 'ops@tonyisking.com', triggeredBy: opsUserId },
        { incidentId: 'INC-OPS-0044', title: 'Quantity mismatch T-4520 (20 units)', description: 'Receiving reported 280 units vs 300 expected on transfer T-4520. Warehouse inspection required.', severity: 'SEV2', status: 'investigating', module: 'warehouse', affectedEntity: 'T-4520', assignedTo: 'warehouse@tonyisking.com', triggeredBy: opsUserId },
        { incidentId: 'INC-OPS-0043', title: 'Duplicate QR detected — retail shelf', description: 'QR-9847231 scanned simultaneously from HCM and Phnom Penh locations. Potential counterfeit or gray market.', severity: 'SEV2', status: 'open', module: 'monitoring', affectedEntity: 'QR-9847231', assignedTo: 'field@tonyisking.com', triggeredBy: opsUserId },
        // Resolved incidents
        { incidentId: 'INC-OPS-0042', title: 'Early activation — batch scanned before receiving', description: 'Batch B-2026-0850 was scanned at retail before warehouse receiving was confirmed.', severity: 'SEV3', status: 'resolved', module: 'monitoring', affectedEntity: 'B-2026-0850', resolution: 'False positive — scanner test by field team', rootCause: 'Scanner calibration test mistakenly used production QR codes', resolvedAt: new Date('2026-03-02') },
        { incidentId: 'INC-OPS-0041', title: 'Geo anomaly scan from Laos', description: 'Product COFFEE-PRE-250 scanned in Vientiane, Laos which is outside authorized distribution region.', severity: 'SEV2', status: 'escalated', module: 'monitoring', affectedEntity: 'COFFEE-PRE-250', resolution: 'Confirmed gray market — escalated to compliance', rootCause: 'Unauthorized distributor in Laos sourced from Thai wholesaler', resolvedAt: new Date('2026-03-01') },
        { incidentId: 'INC-OPS-0040', title: 'Warehouse congestion HCM-03', description: 'Warehouse HCM-03 reached 94% capacity causing receiving delays.', severity: 'SEV3', status: 'resolved', module: 'warehouse', affectedEntity: 'WH-HCM-03', resolution: 'Redistributed to HCM-04 — congestion cleared', rootCause: 'Delayed outbound shipments due to customs hold', resolvedAt: new Date('2026-02-28') },
        { incidentId: 'INC-OPS-0039', title: 'QR printing defect — batch B-2026-0800', description: 'QR labels for 200 units of batch B-2026-0800 had print smearing, making them unscannable.', severity: 'SEV4', status: 'resolved', module: 'production', affectedEntity: 'B-2026-0800', resolution: 'Reprinted 200 labels, old batch voided', rootCause: 'Printer head misalignment', resolvedAt: new Date('2026-02-26') },
        { incidentId: 'INC-OPS-0038', title: 'Shipment delay customs BKK', description: 'Two shipments stuck at Bangkok customs for >48h due to incomplete documentation.', severity: 'SEV3', status: 'resolved', module: 'logistics', affectedEntity: 'SH-8820/SH-8821', resolution: 'Cleared after documentation update', rootCause: 'Missing phytosanitary certificate for organic products', resolvedAt: new Date('2026-02-24') },
        // Recall incidents
        { incidentId: 'INC-RCL-0001', title: 'Recall: Noodle RC 400g underweight batch', description: '8 units of Noodle RC 400g found underweight. Batch B-2026-0870 recalled from 3 distribution points.', severity: 'SEV2', status: 'resolved', module: 'recall', affectedEntity: 'B-2026-0870', resolution: 'All 500 units recalled and replaced. Compensation issued to 3 retailers.', rootCause: 'Filling machine calibration drift', resolvedAt: new Date('2026-02-20') },
        { incidentId: 'INC-RCL-0002', title: 'Recall: Coffee packaging integrity failure', description: 'Vacuum seal failure detected in 15 units of Premium Roast Blend. Risk of oxidation and quality degradation.', severity: 'SEV1', status: 'open', module: 'recall', affectedEntity: 'B-2026-0865', assignedTo: 'ops@tonyisking.com', triggeredBy: opsUserId },
    ];

    const existingInc = await prisma.opsIncident.count();
    if (existingInc < INC_DATA.length) {
        for (const inc of INC_DATA) {
            const existing = await prisma.opsIncident.findFirst({ where: { incidentId: inc.incidentId } });
            if (!existing) {
                await prisma.opsIncident.create({ data: { id: uuidv4(), ...inc, hash: '' } });
            }
        }
        console.log(`[seed-ops] ${INC_DATA.length} incidents seeded`);
    } else {
        console.log(`[seed-ops] Incidents already seeded (${existingInc} existing)`);
    }

    // ═══ ACTIVITY LOG (audit_log) ═══
    const now = new Date();
    const AUDIT_DATA = [
        { action: 'BATCH_CREATED', entityType: 'batch', entityId: 'B-2026-0892', details: { product: 'COFFEE-PRE-250', quantity: 500, facility: 'Factory HCM-01' }, ipAddress: '10.0.1.15' },
        { action: 'TRANSFER_CONFIRMED', entityType: 'transfer', entityId: 'T-4521', details: { from: 'HCM', to: 'SGN', units: 200, mismatches: 0 }, ipAddress: '10.0.1.22' },
        { action: 'SHIPMENT_CREATED', entityType: 'shipment', entityId: 'SH-8827', details: { carrier: 'DHL', route: 'HCM → BKK', tracking: 'DHL-9928371' }, ipAddress: '10.0.1.15' },
        { action: 'INCIDENT_ESCALATED', entityType: 'incident', entityId: 'INC-OPS-0044', details: { severity: 'SEV2', reason: 'Quantity mismatch T-4520', escalatedTo: 'manager' }, ipAddress: '10.0.2.8' },
        { action: 'RECALL_INITIATED', entityType: 'batch', entityId: 'B-2026-0888', details: { reason: 'Contamination risk', units: 200, product: 'NOODLE-RC-400' }, ipAddress: '10.0.1.15' },
        { action: 'QC_APPROVED', entityType: 'quality_check', entityId: 'B-2026-0891', details: { result: 'pass', score: 94, product: 'TEA-ORG-100', units: 1000 }, ipAddress: '10.0.3.5' },
        { action: 'BATCH_SPLIT', entityType: 'batch', entityId: 'B-2026-0885', details: { subA: 'B-2026-0885A', subAQty: 300, subB: 'B-2026-0885B', subBQty: 200 }, ipAddress: '10.0.1.15' },
        { action: 'MISMATCH_REPORTED', entityType: 'transfer', entityId: 'T-4520', details: { expected: 300, received: 280, variance: -20 }, ipAddress: '10.0.1.22' },
        { action: 'SUPPLIER_SCORE_UPDATED', entityType: 'partner', entityId: 'SUP-VN-003', details: { oldScore: 85, newScore: 78, reason: 'Late deliveries' }, ipAddress: '10.0.1.15' },
        { action: 'REPORT_GENERATED', entityType: 'report', entityId: 'RPT-W09', details: { type: 'weekly_summary', period: 'Feb 24 – Mar 2' }, ipAddress: '10.0.0.1' },
    ];

    const existingAudit = await prisma.auditLog.count();
    if (existingAudit < AUDIT_DATA.length) {
        for (let i = 0; i < AUDIT_DATA.length; i++) {
            const a = AUDIT_DATA[i];
            const ts = new Date(now.getTime() - (i + 1) * 15 * 60 * 1000); // 15 min apart
            await prisma.auditLog.create({
                data: {
                    id: uuidv4(),
                    actorId: opsUserId,
                    action: a.action,
                    entityType: a.entityType,
                    entityId: a.entityId,
                    details: a.details,
                    ipAddress: a.ipAddress,
                    timestamp: ts,
                },
            });
        }
        console.log(`[seed-ops] ${AUDIT_DATA.length} audit log entries seeded`);
    } else {
        console.log(`[seed-ops] Audit log already has data (${existingAudit} existing)`);
    }

    // ═══ ANOMALY DETECTIONS (for mismatch + duplicate alerts) ═══
    const ANOMALY_DATA = [
        // Mismatch alerts
        { sourceType: 'shipment', sourceId: 'T-4520', anomalyType: 'quantity_mismatch', severity: 'high', score: 0.85, description: 'Expected 300 units, received 280 — 20 unit variance on Transfer T-4520', details: { expected: 300, received: 280, variance: -20, batch: 'B-2026-0891', route: 'HCM → BKK' }, status: 'investigating' },
        { sourceType: 'shipment', sourceId: 'T-4518', anomalyType: 'weight_mismatch', severity: 'medium', score: 0.62, description: 'Box weight 48.2kg vs manifest 50.0kg — 3.6% variance', details: { expected: 50.0, received: 48.2, variance: -1.8, batch: 'B-2026-0885', route: 'DN → HCM' }, status: 'open' },
        { sourceType: 'shipment', sourceId: 'T-4515', anomalyType: 'quantity_mismatch', severity: 'medium', score: 0.55, description: 'Partial delivery — 180 of 200 units received', details: { expected: 200, received: 180, variance: -20, batch: 'B-2026-0880', route: 'SG → HCM' }, status: 'resolved', resolvedAt: new Date('2026-02-28') },
        { sourceType: 'inventory', sourceId: 'WH-HCM-01', anomalyType: 'mismatch', severity: 'low', score: 0.35, description: 'Cycle count variance: system shows 1205, physical count 1198 — 7 units', details: { system: 1205, physical: 1198, variance: -7, product: 'COFFEE-PRE-250' }, status: 'resolved', resolvedAt: new Date('2026-02-25') },
        // Duplicate alerts
        { sourceType: 'scan', sourceId: 'QR-9847231', anomalyType: 'duplicate_qr', severity: 'critical', score: 0.95, description: 'QR-9847231 scanned from 2 locations simultaneously: HCM and Phnom Penh', details: { qr: 'QR-9847231', product: 'COFFEE-PRE-250', locations: ['HCM, Vietnam', 'Phnom Penh, Cambodia'], timeDelta: '2 minutes' }, status: 'investigating' },
        { sourceType: 'scan', sourceId: 'QR-9847190', anomalyType: 'duplicate_scan', severity: 'high', score: 0.78, description: 'QR-9847190 scanned 5 times within 10 minutes from same device — unusual pattern', details: { qr: 'QR-9847190', product: 'OIL-COC-500', scanCount: 5, timeWindow: '10 minutes', device: 'Android' }, status: 'open' },
        { sourceType: 'scan', sourceId: 'QR-9847100', anomalyType: 'duplicate_qr', severity: 'medium', score: 0.65, description: 'QR-9847100 found in Thai retail market — not in authorized distribution list', details: { qr: 'QR-9847100', product: 'TEA-ORG-100', location: 'Bangkok, Thailand', region: 'unauthorized' }, status: 'resolved', resolvedAt: new Date('2026-02-27') },
    ];

    const existingAnom = await prisma.anomalyDetection.count();
    if (existingAnom < ANOMALY_DATA.length) {
        for (let i = 0; i < ANOMALY_DATA.length; i++) {
            const a = ANOMALY_DATA[i];
            const ts = new Date(now.getTime() - (i + 1) * 3600 * 1000); // 1h apart
            await prisma.anomalyDetection.create({
                data: {
                    id: uuidv4(),
                    sourceType: a.sourceType,
                    sourceId: a.sourceId,
                    anomalyType: a.anomalyType,
                    severity: a.severity,
                    score: a.score,
                    description: a.description,
                    details: a.details,
                    status: a.status,
                    resolvedAt: a.resolvedAt || null,
                    detectedAt: ts,
                },
            });
        }
        console.log(`[seed-ops] ${ANOMALY_DATA.length} anomaly detections seeded`);
    } else {
        console.log(`[seed-ops] Anomaly detections already have data (${existingAnom} existing)`);
    }

    // ═══ FRAUD ALERTS (for geo-alerts page) ═══
    // Get some product IDs for linking
    const products = await prisma.product.findMany({ take: 4 });
    const productMap = {};
    for (const p of products) productMap[p.sku] = p.id;

    const FRAUD_DATA = [
        { alertType: 'geo_anomaly', severity: 'critical', description: 'Product scanned outside authorized region: Vientiane, Laos', details: { location: 'Vientiane, Laos', authorizedRegions: ['VN', 'TH', 'SG', 'KH'], product: 'COFFEE-PRE-250' }, status: 'open', productId: products[0]?.id },
        { alertType: 'geo_velocity', severity: 'high', description: 'Impossible velocity: same QR scanned in HCM and Phnom Penh within 2 minutes', details: { fromCity: 'HCM, Vietnam', toCity: 'Phnom Penh, Cambodia', timeDelta: '2 min', distance: '230 km' }, status: 'investigating', productId: products[0]?.id },
        { alertType: 'geo_anomaly', severity: 'medium', description: 'Product scanned in unauthorized Thai retail outlet', details: { location: 'Bangkok, Thailand', outlet: 'Unauthorized retailer', product: 'TEA-ORG-100' }, status: 'open', productId: products[1]?.id },
        { alertType: 'geo_cluster', severity: 'high', description: 'Cluster of 12 scans from single IP in Myanmar — no distribution in that market', details: { location: 'Yangon, Myanmar', scanCount: 12, ipCluster: true }, status: 'investigating', productId: products[2]?.id },
    ];

    const existingFraud = await prisma.fraudAlert.count({ where: { alertType: { startsWith: 'geo' } } });
    if (existingFraud < FRAUD_DATA.length) {
        for (let i = 0; i < FRAUD_DATA.length; i++) {
            const f = FRAUD_DATA[i];
            await prisma.fraudAlert.create({
                data: {
                    id: uuidv4(),
                    alertType: f.alertType,
                    severity: f.severity,
                    description: f.description,
                    details: f.details,
                    status: f.status,
                    productId: f.productId || null,
                    createdAt: new Date(now.getTime() - (i + 1) * 2 * 3600 * 1000), // 2h apart
                },
            });
        }
        console.log(`[seed-ops] ${FRAUD_DATA.length} fraud alerts (geo) seeded`);
    } else {
        console.log(`[seed-ops] Fraud alerts already have geo data (${existingFraud} existing)`);
    }

    console.log('[seed-ops] ✅ All ops data seeded successfully');
}

seed()
    .catch(e => { console.error('[seed-ops] Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
