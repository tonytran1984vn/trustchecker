const db = require("/opt/trustchecker/server/db");
const { v4 } = require("uuid");

const ORG = "54197b08-bd93-467d-a738-925ba22bdb6c";

(async () => {
  // Update existing rows from actor->org mapping
  const users = await db.prepare("SELECT id, org_id FROM users WHERE org_id IS NOT NULL").all();
  for (const u of users) {
    await db.prepare("UPDATE audit_log SET org_id = $1 WHERE actor_id = $2 AND org_id IS NULL").run(u.org_id, u.id);
  }
  const updated = await db.get("SELECT COUNT(*) as c FROM audit_log WHERE org_id IS NOT NULL");
  console.log("Updated existing with org_id:", updated?.c);

  // Seed 25 ops activities
  const actors = ["ops@tonyisking.com", "warehouse@tonyisking.com", "qc@tonyisking.com", "system"];
  const items = [
    { action: "batch_created", entity: "TIK-B1017", detail: { product: "Painstop Gel", qty: 2078, origin: "Binh Duong Packaging Hub" }},
    { action: "transfer_confirmed", entity: "TRK356255VN", detail: { from: "VietPack Solutions", to: "Asia Distribution Network", carrier: "Viettel Post" }},
    { action: "qc_approved", entity: "TIK-B1036", detail: { product: "ImmunoForce Capsule", score: 97, inspector: "QC Team" }},
    { action: "batch_split", entity: "TIK-B1038", detail: { product: "VitaKing Multi-Vitamin", sub_batches: 3, reason: "Multi-region distribution" }},
    { action: "shipment_dispatched", entity: "TRK958885VN", detail: { carrier: "Giao Hang Nhanh", destination: "Pacific Cold Chain Logistics" }},
    { action: "inventory_updated", entity: "WH-BKK-01", detail: { warehouse: "Bangkok Transit", items_added: 450, utilization: "72%" }},
    { action: "po_created", entity: "PO-20251222-530", detail: { supplier: "Mekong Fresh Farms", product: "Organic Green Tea", total: "$23,400" }},
    { action: "qc_failed", entity: "TIK-B1005", detail: { product: "Weasel Coffee Limited", defects: 3, action: "Hold for re-inspection" }},
    { action: "warehouse_received", entity: "WH-HAN-02", detail: { warehouse: "Hanoi North Hub", batches: 8, weight: "2.4 tons" }},
    { action: "supplier_onboarded", entity: "p-tik-012", detail: { name: "Can Tho Agrifoods", country: "Vietnam", tier: "Bronze" }},
    { action: "recall_initiated", entity: "INC-2025-RCL-01", detail: { product: "Herbal Tea Blend", reason: "Label compliance", affected_units: 150 }},
    { action: "batch_created", entity: "TIK-B1045", detail: { product: "Manuka Honey UMF15+", qty: 1200, origin: "HCMC Central Factory" }},
    { action: "transfer_confirmed", entity: "TRK629103VN", detail: { from: "Mekong Fresh Farms", to: "Asia Distribution Network", carrier: "Pacific Cold Chain" }},
    { action: "incident_escalated", entity: "INC-2025-002", detail: { title: "Unauthorized Route Deviation", severity: "SEV2", assigned: "ops@tonyisking.com" }},
    { action: "batch_merged", entity: "TIK-B1050", detail: { sources: ["TIK-B1018", "TIK-B1019"], product: "Painstop Gel", total_qty: 6200 }},
    { action: "qc_approved", entity: "TIK-B1045", detail: { product: "Manuka Honey UMF15+", score: 99, inspector: "qc@tonyisking.com" }},
    { action: "shipment_dispatched", entity: "TRK882741VN", detail: { carrier: "Viettel Post", destination: "Singapore Gateway Hub" }},
    { action: "inventory_updated", entity: "WH-SGP-03", detail: { warehouse: "Singapore Gateway", items_added: 320, utilization: "65%" }},
    { action: "po_created", entity: "PO-20260110-201", detail: { supplier: "Saigon Pharma Labs", product: "ImmunoForce Capsule", total: "$45,000" }},
    { action: "batch_created", entity: "TIK-B1051", detail: { product: "Premium Gift Box", qty: 500, origin: "HCMC Central Factory" }},
    { action: "warehouse_received", entity: "WH-HCMC-04", detail: { warehouse: "HCMC Cold Storage", batches: 12, weight: "4.8 tons" }},
    { action: "qc_approved", entity: "TIK-B1051", detail: { product: "Premium Gift Box", score: 95, inspector: "qc@tonyisking.com" }},
    { action: "transfer_confirmed", entity: "TRK445912VN", detail: { from: "Can Tho Agrifoods", to: "Bangkok Transit", carrier: "Pacific Cold Chain" }},
    { action: "supplier_onboarded", entity: "p-tik-013", detail: { name: "Da Lat Organic Farm", country: "Vietnam", tier: "Pending" }},
    { action: "batch_created", entity: "TIK-B1052", detail: { product: "Arabica Coffee Raw", qty: 3500, origin: "Da Lat Organic Farm" }},
  ];

  const now = Date.now();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = v4();
    const ts = new Date(now - i * 3600000 * (1 + Math.random() * 0.5)).toISOString();
    const actor = actors[i % actors.length];
    await db.prepare(
      "INSERT INTO audit_log (id, org_id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)"
    ).run(id, ORG, actor, item.action, "batch", item.entity, JSON.stringify(item.detail), "10.0.1.1", ts);
  }

  const total = await db.get("SELECT COUNT(*) as c FROM audit_log WHERE org_id = $1", [ORG]);
  console.log("Total activities for TIK org:", total?.c);
  process.exit(0);
})();
