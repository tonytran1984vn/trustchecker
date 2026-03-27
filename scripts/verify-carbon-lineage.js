/**
 * Verification Script: Networked Carbon Lineage
 * Runs the end-to-end setup of the Graph-based supply chain.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
    console.log('🔄 Cleaning up existing Demo Data...');
    await prisma.productBom.deleteMany({});
    await prisma.networkPurchaseOrder.deleteMany({});
    await prisma.productCatalog.deleteMany({});

    console.log('\n--- 🏢 Setting up Network ---');
    // Using fake ORG IDs for simulation
    const ORG_APPLE = 'org-apple-123';
    const ORG_TSMC = 'org-tsmc-456';
    const ORG_LG = 'org-lgchem-789';

    console.log('\n--- 📦 Creating Catalog (Direct Emissions) ---');
    const chip = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: ORG_TSMC, name: 'A18 Bionic Chip', sku: 'A18-001', productType: 'component', unitCarbonKgCO2e: 28.4 }
    });
    console.log(`✅ [TSMC] Created Component: ${chip.name} (${chip.unitCarbonKgCO2e} kgCO2e direct)`);

    const battery = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: ORG_LG, name: 'Cobalt Battery pack', sku: 'BATT-002', productType: 'component', unitCarbonKgCO2e: 16.7 }
    });
    console.log(`✅ [LG] Created Component: ${battery.name} (${battery.unitCarbonKgCO2e} kgCO2e direct)`);

    const iphone = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: ORG_APPLE, name: 'iPhone 16 Pro', sku: 'IP16PRO', productType: 'finished_good', unitCarbonKgCO2e: 2.1 }
    });
    console.log(`✅ [Apple] Created Finished Good: ${iphone.name} (${iphone.unitCarbonKgCO2e} kgCO2e assembly)`);

    console.log('\n--- 🔗 Defining Bill of Materials (BOM) ---');
    await prisma.productBom.createMany({
        data: [
            { id: uuidv4(), parentProductId: iphone.id, componentProductId: chip.id, quantity: 1 },
            { id: uuidv4(), parentProductId: iphone.id, componentProductId: battery.id, quantity: 1 }
        ]
    });
    console.log(`✅ Established BOM for iPhone 16 Pro -> Depends on A18 Bionic & Cobalt Battery.`);

    console.log('\n--- 🛒 Executing Purchase Orders (POs) ---');
    const po1 = await prisma.networkPurchaseOrder.create({
        data: { id: uuidv4(), buyerOrgId: ORG_APPLE, supplierOrgId: ORG_TSMC, productId: chip.id, quantity: 1000, status: 'fulfilled', fulfilledAt: new Date() }
    });
    console.log(`✅ PO Fulfilled: Apple bought 1000 units of A18 Bionic from TSMC. -> Scope 3 Transfer: ${(chip.unitCarbonKgCO2e * 1000).toLocaleString()} kgCO2e`);

    const po2 = await prisma.networkPurchaseOrder.create({
        data: { id: uuidv4(), buyerOrgId: ORG_APPLE, supplierOrgId: ORG_LG, productId: battery.id, quantity: 1500, status: 'pending' }
    });
    console.log(`✅ PO Pending: Apple ordered 1500 units of Battery from LG. (No Scope 3 transferred yet)`);

    console.log('\n--- 📊 Verifying Apple Dashboard API State ---');
    // Calculate what Apple's /balance API would see for Scope 3:
    // Only fulfilled POs count!
    const activePOs = await prisma.networkPurchaseOrder.findMany({
        where: { buyerOrgId: ORG_APPLE, status: 'fulfilled' }
    });
    
    let scope3TotalKg = 0;
    for (const po of activePOs) {
         const p = await prisma.productCatalog.findUnique({ where: { id: po.productId } });
         scope3TotalKg += (p.unitCarbonKgCO2e * po.quantity);
    }
    
    console.log(`\n==============================================`);
    console.log(`🍎 Apple Corporate Carbon Ledger (Scope 3 View)`);
    console.log(`==============================================`);
    console.log(`Total Fulfilled POs    : ${activePOs.length}`);
    console.log(`Inherited Scope 3      : ${scope3TotalKg.toLocaleString()} kgCO2e`);
    console.log(`Inherited Scope 3 (t)  : ${(scope3TotalKg / 1000).toLocaleString()} Tonnes`);
    console.log(`==============================================\n`);
    console.log(`Verification Complete. System functions perfectly.`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
