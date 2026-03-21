const db = require('./server/db');
(async () => {
  // Check quality_checks columns
  const cols = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quality_checks' ORDER BY ordinal_position");
  console.log('quality_checks columns:');
  cols.forEach(c => console.log('  ', c.column_name, c.data_type));
  
  // Create indexes via raw prisma
  console.log('\n=== Creating indexes via Prisma raw ===');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_detections(anomaly_type)");
    console.log('  ✅ idx_anomaly_type');
  } catch (e) { console.log('  ⚠️', e.message.slice(0,60)); }
  try {
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)");
    console.log('  ✅ idx_shipments_status');
  } catch (e) { console.log('  ⚠️', e.message.slice(0,60)); }
  try {
    await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS idx_anomaly_detected ON anomaly_detections(detected_at DESC)");
    console.log('  ✅ idx_anomaly_detected');
  } catch (e) { console.log('  ⚠️', e.message.slice(0,60)); }
  await prisma.$disconnect();
  
  process.exit(0);
})();
