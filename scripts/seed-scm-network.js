/**
 * SEED SCRIPT: Networked Carbon Lineage
 * 
 * Re-seeds the system with a realistic Supply Chain scenario.
 * It detects the actual Users/Organizations in the DB to anchor the data,
 * ensuring the user can instantly see the data when logging into the Dashboard.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
    console.log('🔄 Cleaning up existing SCM Data...');
    await prisma.productBom.deleteMany({});
    await prisma.networkPurchaseOrder.deleteMany({});
    await prisma.productCatalog.deleteMany({});

    // 1. Find or Create Actual Orgs in the Database
    console.log('\n--- 🏢 Identifying Active Organizations ---');
    // Ensure we fetch Orgs including Demo Corp
    let orgs = await prisma.organization.findMany({ 
        take: 3,
        orderBy: { users: { _count: 'desc' } }, 
        include: { users: true }
    });
    
    // Explicitly find Demo Corp by its common name/slug, or fallback to the first
    const demoCorp = orgs.find(o => o.name === 'Demo Corp' || o.slug === 'demo-corp');
    const orgBuyer = demoCorp || orgs[0];
    const orgSupplier = orgs.find(o => o.id !== orgBuyer.id) || orgs[1];

    if (!orgBuyer || !orgSupplier) {
        console.log('⚠️ Less than 2 Orgs found. Creating dummy orgs.');
        // fallback in case of empty db
        await prisma.organization.createMany({
            data: [
                { id: uuidv4(), name: 'TrustChecker Demo Org (Buyer)', slug: 'trustchecker-buyer-' + Date.now() },
                { id: uuidv4(), name: 'Vietnambeans (Supplier)', slug: 'vietnambeans-supplier-' + Date.now() }
            ],
            skipDuplicates: true
        });
        const fresh = await prisma.organization.findMany({ take: 2 });
        orgBuyer = fresh[0];
        orgSupplier = fresh[1];
    }

    console.log(`✅ [Buyer] Identified Org: ${orgBuyer.name} (${orgBuyer.id})`);
    console.log(`✅ [Supplier] Identified Org: ${orgSupplier.name} (${orgSupplier.id})`);

    // 2. Create the Products
    console.log('\n--- 📦 Seeding Product Catalog ---');
    
    // Supplier creates Components
    const screen = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: orgSupplier.id, name: 'OLED Screen Gen 5', sku: 'OLED-G5', productType: 'component', unitCarbonKgCO2e: 18.2 }
    });
    console.log(`   + [Supplier] Created Component: ${screen.name} (${screen.unitCarbonKgCO2e} kgCO₂e direct)`);

    const childChip = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: orgSupplier.id, name: 'A18 Bionic Chip', sku: 'A18-PRO', productType: 'component', unitCarbonKgCO2e: 28.4 }
    });
    console.log(`   + [Supplier] Created Component: ${childChip.name} (${childChip.unitCarbonKgCO2e} kgCO₂e direct)`);

    const battery = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: orgSupplier.id, name: 'Cobalt Battery Pack', sku: 'BATT-MAX', productType: 'component', unitCarbonKgCO2e: 16.7 }
    });
    console.log(`   + [Supplier] Created Component: ${battery.name} (${battery.unitCarbonKgCO2e} kgCO₂e direct)`);

    // Buyer creates Finished Goods
    const iphone = await prisma.productCatalog.create({
        data: { id: uuidv4(), orgId: orgBuyer.id, name: 'iPhone 16 Pro', sku: 'IP16PRO-MAX', productType: 'finished_good', unitCarbonKgCO2e: 2.1 }
    });
    console.log(`   + [Buyer] Created Finished Good: ${iphone.name} (${iphone.unitCarbonKgCO2e} kgCO₂e local assembly)`);

    // 3. Define the Bill of Materials (BOM)
    console.log('\n--- 🔗 Defining Bill of Materials (BOM) ---');
    await prisma.productBom.createMany({
        data: [
            { id: uuidv4(), parentProductId: iphone.id, componentProductId: screen.id, quantity: 1 },
            { id: uuidv4(), parentProductId: iphone.id, componentProductId: childChip.id, quantity: 1 },
            { id: uuidv4(), parentProductId: iphone.id, componentProductId: battery.id, quantity: 1 }
        ]
    });
    console.log(`✅ Established Graph BOM for ${iphone.name} -> Depends on Screen, Chip, and Battery.`);

    // 4. Execute Purchase Orders
    console.log('\n--- 🛒 Executing Network Purchase Orders (POs) ---');
    
    // Fulfilled PO
    await prisma.networkPurchaseOrder.create({
        data: { id: uuidv4(), buyerOrgId: orgBuyer.id, supplierOrgId: orgSupplier.id, productId: childChip.id, quantity: 5000, status: 'fulfilled', fulfilledAt: new Date(Date.now() - 86400000) }
    });
    console.log(`✅ [Fulfilled] PO for 5,000x A18 Chips -> Automatically inherited ${(childChip.unitCarbonKgCO2e * 5000).toLocaleString()} kgCO₂e Scope 3.`);

    // Fulfilled PO
    await prisma.networkPurchaseOrder.create({
        data: { id: uuidv4(), buyerOrgId: orgBuyer.id, supplierOrgId: orgSupplier.id, productId: screen.id, quantity: 3000, status: 'fulfilled', fulfilledAt: new Date(Date.now() - 172800000) }
    });
    console.log(`✅ [Fulfilled] PO for 3,000x OLED Screens -> Automatically inherited ${(screen.unitCarbonKgCO2e * 3000).toLocaleString()} kgCO₂e Scope 3.`);

    // Pending PO
    await prisma.networkPurchaseOrder.create({
        data: { id: uuidv4(), buyerOrgId: orgBuyer.id, supplierOrgId: orgSupplier.id, productId: battery.id, quantity: 10000, status: 'pending' }
    });
    console.log(`✅ [Pending] PO for 10,000x Batteries -> (No Scope 3 transferred yet)`);

    console.log(`\n🎉 Seed Success: The Dashboard should now reflect high-fidelity cross-org execution!`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  });
