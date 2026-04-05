const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dbUrl = process.env.DATABASE_URL || "postgresql://dangtranhai@localhost:5432/trustchecker";
console.log("Connecting to DB for script execution context...");

async function run() {
  try {
    console.log("==================================================");
    console.log("   SOVEREIGN OS: TIER 4.2 DB PROVISIONING SCRIPT");
    console.log("==================================================");

    // 1. Manually create the missing tables using raw DB execution to bypass Prisma drift
    console.log("[1/3] Creating Executive Missing Tables safely...");

    const tableSQLs = [
      `CREATE TABLE IF NOT EXISTS executive_actions (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'Medium', status TEXT NOT NULL DEFAULT 'Pending',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS executive_approvals (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, type TEXT NOT NULL, requested_by TEXT NOT NULL,
          risk TEXT NOT NULL DEFAULT 'Medium', timestamp TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending',
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS executive_scenarios (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, severity TEXT NOT NULL,
          created TEXT NOT NULL, impact DOUBLE PRECISION NOT NULL DEFAULT 0,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS executive_committees (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, members INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'Active', created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS executive_members (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
          avatar TEXT, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS executive_reports (
          id TEXT PRIMARY KEY, org_id TEXT NOT NULL, title TEXT NOT NULL, type TEXT NOT NULL,
          date TEXT NOT NULL, file_size TEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const sql of tableSQLs) {
       await prisma.$executeRawUnsafe(sql);
    }
    console.log("      [OK] Tables created or verified.");

    const user = await prisma.user.findUnique({ where: { email: 'owner@tonyisking.com' } });
    const orgId = user?.orgId || user?.org_id;
    
    if (!orgId) {
      console.warn("\n[WARNING] Could not find owner@tonyisking.com or their orgId. Will seed for 'ALL_ORGS'.");
    }
    const TARGET_ORG = orgId || 'tc_org_demo123';
    
    console.log(`\n[2/3] Found Target ORG_ID: ${TARGET_ORG}`);
    console.log("      Seeding Tier 4.2 data payloads...");

    // Seed Actions
    await prisma.executiveAction.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveAction.createMany({
       data: [
          { orgId: TARGET_ORG, title: "Liquidate Defunct Sub-Entities", description: "Audit flags 3 dormant legal entities creating compliance drag. Immediate liquidation advised via Sovereign protocols.", priority: "High", status: "Pending" },
          { orgId: TARGET_ORG, title: "Elevate Holding Security", description: "Implement V4 multi-sig quorum rules on all cross-border trust fund transfers exceeding $5M.", priority: "Critical", status: "Pending" },
          { orgId: TARGET_ORG, title: "Singapore Expansion Finalization", description: "Approval required for Family Office (VCC structure) operational seed capital.", priority: "Medium", status: "Pending" },
       ]
    });

    // Seed Approvals
    await prisma.executiveApproval.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveApproval.createMany({
       data: [
          { orgId: TARGET_ORG, type: "Capital Deployment", requestedBy: "CIO Desk", risk: "Medium", timestamp: "1 hour ago", status: "Pending" },
          { orgId: TARGET_ORG, type: "System Access Override", requestedBy: "Security Automation", risk: "High", timestamp: "3 hours ago", status: "Pending" },
          { orgId: TARGET_ORG, type: "M&A Deal Room Activation", requestedBy: "A. Kingston (Legal)", risk: "Low", timestamp: "5 hours ago", status: "Pending" }
       ]
    });

    // Seed Scenarios
    await prisma.executiveScenario.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveScenario.createMany({
       data: [
          { orgId: TARGET_ORG, name: "US-China Blockade (Hardware Assets)", severity: "Critical", created: "2026-04-01", impact: 14.5 },
          { orgId: TARGET_ORG, name: "Regional Banking Contagion", severity: "High", created: "2026-03-15", impact: 8.2 },
          { orgId: TARGET_ORG, name: "New FDI Tax Policy (Vietnam)", severity: "Medium", created: "2026-02-10", impact: 3.1 }
       ]
    });

    // Seed Board & Committees
    await prisma.executiveCommittee.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveCommittee.createMany({
       data: [
          { orgId: TARGET_ORG, name: "Macro Risk Governance", members: 5, status: "Active" },
          { orgId: TARGET_ORG, name: "Asset Protection & Trust", members: 3, status: "Active" },
          { orgId: TARGET_ORG, name: "Global Talent Board", members: 4, status: "Active" }
       ]
    });

    await prisma.executiveMember.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveMember.createMany({
       data: [
          { orgId: TARGET_ORG, name: "Tony T.", role: "Charman & Chief Architect" },
          { orgId: TARGET_ORG, name: "Alexander R.", role: "Lead Trustee" },
          { orgId: TARGET_ORG, name: "Minh HQ.", role: "Tech Steering" }
       ]
    });

    // Seed Reports
    await prisma.executiveReport.deleteMany({ where: { orgId: TARGET_ORG } });
    await prisma.executiveReport.createMany({
       data: [
          { orgId: TARGET_ORG, title: "Q1 Systemic Integrity Audit", type: "PDF", date: "2026-04-03", fileSize: "12.4 MB" },
          { orgId: TARGET_ORG, title: "Cross-Border Wealth Trace", type: "CSV", date: "2026-03-25", fileSize: "4.8 MB" },
          { orgId: TARGET_ORG, title: "Global Compliance Matrix", type: "PDF", date: "2026-03-10", fileSize: "24.1 MB" }
       ]
    });

    // ===== Seed Portfolio Health: Usage & Revenue (12-month data) =====
    console.log("      Seeding Portfolio Health data (Usage + Revenue)...");

    // Create tables if they don't exist (bypass Prisma migration drift)
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS usage_aggregates_monthly CASCADE;`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE usage_aggregates_monthly (
        org_id TEXT NOT NULL,
        feature TEXT NOT NULL,
        cycle TEXT NOT NULL,
        total BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (org_id, feature, cycle)
      );
    `);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS fact_revenue_monthly CASCADE;`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE fact_revenue_monthly (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id TEXT NOT NULL,
        month DATE NOT NULL,
        subscription_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
        overage_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
        total_revenue DOUBLE PRECISION NOT NULL DEFAULT 0,
        UNIQUE(org_id, month)
      );
    `);
    console.log("      [OK] Portfolio tables created or verified.");

    // Seed UsageAggregateMonthly (composite key: orgId + feature + cycle)
    // Delete existing entries for this org
    await prisma.usageAggregateMonthly.deleteMany({ where: { orgId: TARGET_ORG } }).catch(() => {});
    
    const usageData = [];
    const months = ['2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04'];
    const activeUsersProgression = [280, 310, 290, 340, 360, 380, 420, 410, 430, 450, 470, 502];
    const scanProgression = [5200, 6100, 5800, 7400, 7800, 8200, 9100, 8800, 9500, 10100, 11300, 12050];
    
    for (let i = 0; i < months.length; i++) {
      usageData.push({ orgId: TARGET_ORG, feature: 'active_users', cycle: months[i], total: BigInt(activeUsersProgression[i]) });
      usageData.push({ orgId: TARGET_ORG, feature: 'qr_scan', cycle: months[i], total: BigInt(scanProgression[i]) });
    }
    await prisma.usageAggregateMonthly.createMany({ data: usageData });
    console.log(`      [OK] Seeded ${usageData.length} UsageAggregateMonthly rows.`);

    // Seed FactRevenueMonthly (unique key: orgId + month)
    await prisma.factRevenueMonthly.deleteMany({ where: { orgId: TARGET_ORG } }).catch(() => {});
    
    const revenueData = months.map((m, i) => {
      const subscriptionBase = 68000 + (i * 5200);          // Growing subscription from $68k to $125k
      const overageBase = 8000 + Math.floor(i * 1800);       // Overage grows from $8k to $28k
      return {
        orgId: TARGET_ORG,
        month: new Date(`${m}-01T00:00:00Z`),
        subscriptionRevenue: subscriptionBase,
        overageRevenue: overageBase,
        totalRevenue: subscriptionBase + overageBase
      };
    });
    await prisma.factRevenueMonthly.createMany({ data: revenueData });
    console.log(`      [OK] Seeded ${revenueData.length} FactRevenueMonthly rows.`);

    // ===== Seed Sustainability: Products + Scores =====
    console.log("      Seeding Sustainability Impact data...");

    // Ensure products table has sample products for this org
    const sustainProducts = [
      { name: 'Organic Coffee Blend A1', sku: `SUST-ORG-001-${TARGET_ORG.slice(0,8)}`, category: 'Food & Beverage', manufacturer: 'Sovereign Farms Ltd', orgId: TARGET_ORG },
      { name: 'Recycled Paper Pack B2', sku: `SUST-ORG-002-${TARGET_ORG.slice(0,8)}`, category: 'Paper & Packaging', manufacturer: 'GreenPulp Industries', orgId: TARGET_ORG },
      { name: 'Solar Panel Module C3', sku: `SUST-ORG-003-${TARGET_ORG.slice(0,8)}`, category: 'Renewable Energy', manufacturer: 'SolarTech Vietnam', orgId: TARGET_ORG },
      { name: 'Bamboo Fabric Roll D4', sku: `SUST-ORG-004-${TARGET_ORG.slice(0,8)}`, category: 'Textiles', manufacturer: 'EcoWeave Co.', orgId: TARGET_ORG },
      { name: 'Electric Cargo Bike E5', sku: `SUST-ORG-005-${TARGET_ORG.slice(0,8)}`, category: 'Transport', manufacturer: 'VeloGreen GmbH', orgId: TARGET_ORG },
      { name: 'Biodegradable Detergent F6', sku: `SUST-ORG-006-${TARGET_ORG.slice(0,8)}`, category: 'Chemicals', manufacturer: 'BioClean Asia', orgId: TARGET_ORG },
      { name: 'Hemp Building Blocks G7', sku: `SUST-ORG-007-${TARGET_ORG.slice(0,8)}`, category: 'Construction', manufacturer: 'HempBuild LLC', orgId: TARGET_ORG },
      { name: 'Fair-Trade Cocoa Extract H8', sku: `SUST-ORG-008-${TARGET_ORG.slice(0,8)}`, category: 'Food Ingredients', manufacturer: 'TrueOrigin Trading', orgId: TARGET_ORG },
    ];

    // Upsert products using raw SQL (bypass Prisma schema drift for product_capabilities column)
    for (const p of sustainProducts) {
      await prisma.$executeRawUnsafe(`DELETE FROM products WHERE sku = '${p.sku}'`).catch(() => {});
      await prisma.$executeRawUnsafe(
        `INSERT INTO products (id, name, sku, category, manufacturer, org_id, description, batch_number, origin_country, trust_score, quantity, status, created_at, updated_at)
         VALUES (gen_random_uuid(), '${p.name}', '${p.sku}', '${p.category}', '${p.manufacturer}', '${p.orgId}', '', '', '', 100.0, 0, 'active', NOW(), NOW())`
      ).catch(e => console.log(`      [WARN] Insert ${p.sku}:`, e.message));
    }

    // Get the product IDs we just created
    const createdProducts = await prisma.product.findMany({ 
      where: { orgId: TARGET_ORG, sku: { startsWith: 'SUST-ORG-' } },
      select: { id: true, name: true }
    });

    if (createdProducts.length > 0) {
      // Delete old sustainability scores for these products
      const productIds = createdProducts.map(p => p.id);
      await prisma.$executeRawUnsafe(`DELETE FROM sustainability_scores WHERE product_id IN (${productIds.map(id => `'${id}'`).join(',')})`).catch(() => {});

      // Realistic sustainability scores — variety of grades
      const scoreProfiles = [
        { carbon: 92, water: 88, recycle: 95, ethical: 90, packaging: 85, transport: 78 }, // A+: 88.9
        { carbon: 85, water: 82, recycle: 88, ethical: 84, packaging: 80, transport: 75 }, // A: 82.9
        { carbon: 78, water: 70, recycle: 80, ethical: 76, packaging: 72, transport: 68 }, // B: 74.3
        { carbon: 72, water: 68, recycle: 74, ethical: 70, packaging: 65, transport: 60 }, // B: 68.8
        { carbon: 65, water: 62, recycle: 68, ethical: 64, packaging: 58, transport: 55 }, // C: 62.3
        { carbon: 60, water: 55, recycle: 62, ethical: 58, packaging: 52, transport: 48 }, // C: 56.2
        { carbon: 55, water: 50, recycle: 58, ethical: 52, packaging: 45, transport: 42 }, // D: 50.8
        { carbon: 88, water: 85, recycle: 90, ethical: 86, packaging: 82, transport: 80 }, // A: 85.5
      ];

      const scoreData = createdProducts.map((prod, i) => {
        const s = scoreProfiles[i] || scoreProfiles[0];
        const overall = s.carbon * 0.2 + s.water * 0.15 + s.recycle * 0.2 + s.ethical * 0.2 + s.packaging * 0.1 + s.transport * 0.15;
        const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';
        return {
          productId: prod.id,
          carbonFootprint: s.carbon,
          waterUsage: s.water,
          recyclability: s.recycle,
          ethicalSourcing: s.ethical,
          packagingScore: s.packaging,
          transportScore: s.transport,
          overallScore: Math.round(overall * 10) / 10,
          grade,
          assessedBy: user?.id || null,
        };
      });
      await prisma.sustainabilityScore.createMany({ data: scoreData });
      console.log(`      [OK] Seeded ${scoreData.length} SustainabilityScore rows.`);
    } else {
      console.log("      [WARN] No products created, skipping sustainability scores.");
    }

    // ===== Seed Risk Intelligence: RiskAnalyticSnapshot =====
    console.log("\n[3] Seeding Risk Intelligence (RiskAnalyticSnapshot)...");
    if (prisma.riskAnalyticSnapshot) {
      await prisma.riskAnalyticSnapshot.deleteMany({ where: { orgId: TARGET_ORG } }).catch(() => {});
      const statuses = ['PROCESSED', 'PROCESSED', 'PROCESSED', 'ALERT', 'PROCESSED'];
      const levels = ['Low', 'Low', 'Medium', 'High', 'Low'];
      const vectors = ['SCM Port Delay', 'Market Stress Test', 'Cyber Threat Intel', 'Liquidity Constriction', 'Geopolitical Shift'];
      
      const riskData = Array.from({length: 5}).map((_, i) => ({
          orgId: TARGET_ORG,
          timestamp: new Date(Date.now() - i * 3600000), // 1 hour intervals
          vector: vectors[i],
          riskLevel: levels[i],
          status: statuses[i],
          payload: JSON.stringify({ active_scanners: 1024, targets: 18500, critical_threats: i === 3 ? 3 : 0 }),
          basePFraud: 0.02,
          baseWcrs: 0.1,
          p50EsgDrop: 0.05,
          p50WaccShock: 0.02,
          p50Evd: 0.01,
          p95EsgDrop: 0.1,
          p95WaccShock: 0.05,
          p95Evd: 0.03,
          p99EsgDrop: 0.15,
          p99WaccShock: 0.08,
          p99Evd: 0.05
      }));
      await prisma.riskAnalyticSnapshot.createMany({ data: riskData });
      console.log(`      [OK] Seeded 5 RiskAnalyticSnapshot rows.`);
    } else {
      console.log(`      [SKIP] riskAnalyticSnapshot model not found.`);
    }

    // ===== Seed TCAR: LrgfRiskScore & TrustScore =====
    console.log("\n[4] Seeding Capital Exposure (TCAR)...");
    if (prisma.lrgfRiskScore) {
      await prisma.lrgfRiskScore.deleteMany({ where: { orgId: TARGET_ORG } }).catch(() => {});
      const tcarScores = Array.from({length: 12}).map((_, i) => ({
          orgId: TARGET_ORG,
          eventId: `EVT-${Date.now()}-${i}`,
          ersScore: 85 - i,
          financialImpact: 1400000 + (Math.random() * 500000 - 250000),
          tier: i % 3 === 0 ? 'L1 TCAR' : 'L2 TCAR',
          modelVersion: 'v2.1',
          weightHash: 'system',
          driftIndex: 0.02,
          createdAt: new Date(Date.now() - i * 86400000 * 30) // monthly
      }));
      await prisma.lrgfRiskScore.createMany({ data: tcarScores });
      console.log(`      [OK] Seeded 12 LrgfRiskScore rows.`);
    }
    // trust_score is now derived dynamically from Products average in the API.

    console.log("\n[4/4] Process Completed Successfully.");
    console.log("==================================================");

  } catch (error) {
    console.error("FATAL ERROR: ", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
