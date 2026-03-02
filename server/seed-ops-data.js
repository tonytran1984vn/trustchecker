/**
 * Seed Ops Data — Purchase Orders, Warehouses, Quality Checks, Demand Forecasts
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

    console.log('[seed-ops] ✅ All ops data seeded successfully');
}

seed()
    .catch(e => { console.error('[seed-ops] Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
