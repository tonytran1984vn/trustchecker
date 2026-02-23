#!/usr/bin/env node
/**
 * TrustChecker — Tony is King Sample Data Seed
 * Seeds comprehensive data for ALL system features
 * Run: node scripts/seed-tonyisking.js
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();
const sha = () => crypto.randomBytes(32).toString('hex');
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randFloat = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);
const past = d => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(randInt(0,23), randInt(0,59)); return x.toISOString(); };
const future = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString(); };

const ORG_NAME = 'Tony is King';
const ORG_SLUG = 'tonyisking';
const PWD = '123qaz12';
const COMPANY = 'tonyisking.com';

async function seed() {
  console.log('🌱 Tony is King — Full Feature Data Seeder\n');
  const db = require('../server/db');
  if (db._readyPromise) await db._readyPromise;
  else if (db.init) await db.init();
  await new Promise(r => setTimeout(r, 2000));

  const hash = await bcrypt.hash(PWD, 12);
  const orgId = uuid();

  // ═══ 1. ORGANIZATION ═══
  console.log('🏢 Organization...');
  await db.run(`INSERT OR IGNORE INTO organizations (id,name,slug,plan,feature_flags,status) VALUES (?,?,?,?,?,?)`,
    [orgId, ORG_NAME, ORG_SLUG, 'enterprise', JSON.stringify({trustgraph:true,digital_twin:true,blockchain:true,nft:true,ai_analytics:true,consortium:true}), 'active']);

  // ═══ 2. USERS (18 roles) ═══
  console.log('👤 Users...');
  const users = [
    {email:'admin@tonyisking.com', user:'tik_admin', role:'super_admin', type:'platform', rbac:'company_admin'},
    {email:'security@tonyisking.com', user:'tik_security', role:'platform_security', type:'platform', rbac:'platform_security'},
    {email:'datagov@tonyisking.com', user:'tik_datagov', role:'data_gov_officer', type:'platform', rbac:'data_gov_officer'},
    {email:'companyadmin@tonyisking.com', user:'tik_companyadmin', role:'company_admin', type:'tenant', rbac:'company_admin'},
    {email:'ceo@tonyisking.com', user:'tik_ceo', role:'executive', type:'tenant', rbac:'executive'},
    {email:'ops@tonyisking.com', user:'tik_ops', role:'ops_manager', type:'tenant', rbac:'ops_manager'},
    {email:'risk@tonyisking.com', user:'tik_risk', role:'risk_officer', type:'tenant', rbac:'risk_officer'},
    {email:'compliance@tonyisking.com', user:'tik_compliance', role:'compliance_officer', type:'tenant', rbac:'compliance_officer'},
    {email:'dev@tonyisking.com', user:'tik_dev', role:'developer', type:'tenant', rbac:'developer'},
    {email:'ggc@tonyisking.com', user:'tik_ggc', role:'ggc_member', type:'tenant', rbac:'ggc_member'},
    {email:'riskcom@tonyisking.com', user:'tik_riskcom', role:'risk_committee', type:'tenant', rbac:'risk_committee'},
    {email:'ivu@tonyisking.com', user:'tik_ivu', role:'ivu_validator', type:'tenant', rbac:'ivu_validator'},
    {email:'scm@tonyisking.com', user:'tik_scm', role:'scm_analyst', type:'tenant', rbac:'scm_analyst'},
    {email:'blockchain@tonyisking.com', user:'tik_blockchain', role:'blockchain_operator', type:'tenant', rbac:'blockchain_operator'},
    {email:'carbon@tonyisking.com', user:'tik_carbon', role:'carbon_officer', type:'tenant', rbac:'carbon_officer'},
    {email:'operator@tonyisking.com', user:'tik_operator', role:'operator', type:'tenant', rbac:'operator'},
    {email:'auditor@tonyisking.com', user:'tik_auditor', role:'auditor', type:'tenant', rbac:'auditor'},
    {email:'viewer@tonyisking.com', user:'tik_viewer', role:'viewer', type:'tenant', rbac:'viewer'},
  ];
  const userIds = {};
  for (const u of users) {
    const id = uuid();
    userIds[u.role] = id;
    const existing = await db.get ? await db.get('SELECT id FROM users WHERE email = ?', [u.email]) : null;
    if (existing) {
      await db.run('UPDATE users SET password_hash=?, role=?, user_type=?, company=?, org_id=? WHERE email=?', [hash, u.role, u.type, COMPANY, orgId, u.email]);
      userIds[u.role] = existing.id;
      console.log(`  ↻ ${u.email}`);
    } else {
      await db.run('INSERT OR IGNORE INTO users (id,username,email,password_hash,role,user_type,company,org_id,must_change_password) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, u.user, u.email, hash, u.role, u.type, COMPANY, orgId, 0]);
      console.log(`  ✓ ${u.email} → ${u.role}`);
    }
    // RBAC assignment
    const roleId = `role-${orgId}-${u.rbac}`;
    await db.run('INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?,?,?)', [userIds[u.role], roleId, 'seed-tonyisking']);
  }
  const adminId = userIds['super_admin'];

  // ═══ 3. PRODUCTS (15) ═══
  console.log('📦 Products...');
  const prodDefs = [
    ['TIK Premium Coffee Blend','TIK-COF-001','Food & Beverage','Tony Coffee Factory','Vietnam',96.5,'Single-origin Đà Lạt arabica, hand-picked'],
    ['TIK Organic Green Tea','TIK-TEA-002','Food & Beverage','Tony Tea Garden','Vietnam',94.2,'High-altitude organic green tea from Thái Nguyên'],
    ['TIK Cashew Roasted','TIK-NUT-003','Food & Beverage','Binh Phuoc Nuts Co','Vietnam',92.8,'Premium roasted cashew W320 grade'],
    ['TIK Swiss Watch Limited','TIK-WAT-004','Luxury Goods','Geneva Timepieces SA','Switzerland',99.1,'18K rose gold chronograph #127/500'],
    ['TIK Italian Leather Bag','TIK-BAG-005','Fashion','Milano Crafts SpA','Italy',94.8,'Full-grain Tuscan leather tote'],
    ['TIK Vitamin D3 5000IU','TIK-VIT-006','Pharmaceuticals','BioHealth Labs Inc','United States',97.3,'FDA-approved softgels'],
    ['TIK Dark Chocolate 85%','TIK-CHO-007','Food & Beverage','Quito Cacao Collective','Ecuador',93.1,'Organic fair trade cacao'],
    ['TIK K-Beauty Serum','TIK-SER-008','Cosmetics','Seoul Glow Labs','South Korea',95.4,'Hyaluronic acid + niacinamide'],
    ['TIK Japanese Whisky 18Y','TIK-WHI-009','Spirits','Yamazaki Distillery','Japan',99.5,'Single malt Mizunara oak'],
    ['TIK EV Battery Gen4','TIK-BAT-010','Electronics','Stuttgart Power GmbH','Germany',91.2,'72kWh LFP battery module'],
    ['TIK Baby Formula Organic','TIK-BAB-011','Baby Products','Pure NZ Nutrition','New Zealand',98.8,'A2 grass-fed, DHA enriched'],
    ['TIK Extra Virgin Olive Oil','TIK-OIL-012','Food & Beverage','Cretan Gold Estate','Greece',93.6,'PDO Sitia Koroneiki olives'],
    ['TIK IoT Gateway Pro','TIK-IOT-013','Electronics','Taipei Semi Inc','Taiwan',90.1,'LoRaWAN+5G edge gateway'],
    ['TIK Silk Scarf Hoi An','TIK-SLK-014','Fashion','Hoi An Silk Village','Vietnam',88.5,'Hand-woven traditional silk'],
    ['TIK Pepper Black Phu Quoc','TIK-PEP-015','Food & Beverage','Phu Quoc Pepper Farm','Vietnam',91.7,'GI-certified Phu Quoc pepper'],
  ];
  const productIds=[], qrIds=[], batchIds=[];
  for (const [name,sku,cat,mfg,origin,trust,desc] of prodDefs) {
    const pid=uuid(), qid=uuid(), bid=uuid();
    const bn=`BATCH-2026-${randInt(1000,9999)}`;
    productIds.push(pid); qrIds.push(qid); batchIds.push(bid);
    const ca = past(randInt(15,60));
    await db.run('INSERT OR IGNORE INTO products (id,name,sku,description,category,manufacturer,batch_number,origin_country,registered_by,trust_score,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [pid,name,sku,desc,cat,mfg,bn,origin,adminId,trust,'active',ca]);
    await db.run('INSERT OR IGNORE INTO qr_codes (id,product_id,qr_data,status,generated_at,expires_at) VALUES (?,?,?,?,?,?)',
      [qid,pid,`TC-${sku}-${sha().slice(0,8).toUpperCase()}`,'active',ca,future(365)]);
    await db.run('INSERT OR IGNORE INTO batches (id,batch_number,product_id,quantity,manufactured_date,expiry_date,origin_facility,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [bid,bn,pid,randInt(500,5000),past(randInt(30,60)),future(randInt(180,730)),mfg,'active',ca]);
    await db.run('INSERT OR IGNORE INTO trust_scores (id,product_id,score,fraud_factor,consistency_factor,compliance_factor,history_factor,calculated_at) VALUES (?,?,?,?,?,?,?,?)',
      [uuid(),pid,trust,randFloat(0,8),randFloat(85,100),randFloat(88,100),randFloat(80,100),past(randInt(0,3))]);
  }
  console.log(`  ✓ ${prodDefs.length} products + QR + batches + trust scores`);

  // ═══ 4. SCAN EVENTS (200) ═══
  console.log('📱 Scans...');
  const geos=[{c:'Ho Chi Minh City',co:'VN',la:10.77,lo:106.70},{c:'Tokyo',co:'JP',la:35.67,lo:139.65},{c:'New York',co:'US',la:40.71,lo:-74.00},{c:'London',co:'GB',la:51.50,lo:-0.12},{c:'Singapore',co:'SG',la:1.35,lo:103.81},{c:'Paris',co:'FR',la:48.85,lo:2.35},{c:'Seoul',co:'KR',la:37.56,lo:126.97},{c:'Sydney',co:'AU',la:-33.86,lo:151.20},{c:'Berlin',co:'DE',la:52.52,lo:13.40},{c:'Dubai',co:'AE',la:25.20,lo:55.27},{c:'Bangkok',co:'TH',la:13.75,lo:100.50},{c:'Hanoi',co:'VN',la:21.02,lo:105.83},{c:'Mumbai',co:'IN',la:19.07,lo:72.87},{c:'Shanghai',co:'CN',la:31.23,lo:121.47},{c:'Zurich',co:'CH',la:47.37,lo:8.54},{c:'San Francisco',co:'US',la:37.77,lo:-122.41},{c:'Toronto',co:'CA',la:43.65,lo:-79.38},{c:'Melbourne',co:'AU',la:-37.81,lo:144.96}];
  const scanRes=['authentic','authentic','authentic','authentic','authentic','authentic','authentic','suspicious','counterfeit'];
  const scanIds=[];
  for(let i=0;i<200;i++){
    const sid=uuid(); scanIds.push(sid);
    const pi=randInt(0,productIds.length-1), g=rand(geos), r=rand(scanRes);
    const fs=r==='authentic'?randFloat(0,12):r==='suspicious'?randFloat(30,65):randFloat(72,100);
    const ts=Math.max(0,Math.min(100,100-fs+randFloat(-4,4)));
    await db.run('INSERT OR IGNORE INTO scan_events (id,qr_code_id,product_id,scan_type,ip_address,latitude,longitude,geo_city,geo_country,user_agent,result,fraud_score,trust_score,response_time_ms,scanned_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [sid,qrIds[pi],productIds[pi],'validation',`${randInt(100,254)}.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`,g.la+randFloat(-0.05,0.05),g.lo+randFloat(-0.05,0.05),g.c,g.co,rand(['TrustChecker-Mobile/3.2','TrustChecker-SDK/2.1 (Android)','TrustChecker-SDK/2.1 (iOS)','TrustChecker-Web/1.0']),r,fs,ts,randInt(45,500),past(randInt(0,30))]);
  }
  console.log('  ✓ 200 scan events');

  // ═══ 5. FRAUD ALERTS (25) ═══
  console.log('🚨 Fraud alerts...');
  const alertTypes=[['velocity_anomaly','high','47 scans in 2 min'],['geo_mismatch','critical','Scanned in Lagos, expected EU'],['duplicate_scan','medium','3 countries in 1 hour'],['counterfeit_detected','critical','AI 94.7% visual mismatch'],['supply_chain_break','high','Skipped authorized distributor'],['price_anomaly','medium','Listed 40% below MSRP'],['compromised_qr','high','QR integrity check failed']];
  for(let i=0;i<25;i++){
    const a=rand(alertTypes), st=rand(['open','open','investigating','resolved','escalated']);
    await db.run('INSERT OR IGNORE INTO fraud_alerts (id,scan_event_id,product_id,alert_type,severity,description,status,resolved_by,resolved_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(scanIds),rand(productIds),a[0],a[1],a[2],st,st==='resolved'?adminId:null,st==='resolved'?past(randInt(0,3)):null,past(randInt(0,14))]);
  }
  console.log('  ✓ 25 fraud alerts');

  // ═══ 6. BLOCKCHAIN SEALS (50) ═══
  console.log('⛓️ Blockchain seals...');
  let prevHash='0'.repeat(64);
  const sealTypes=['product_registration','scan_validation','fraud_detection','supply_chain_update','certification_anchor','batch_verification'];
  for(let i=0;i<50;i++){
    const dh=sha();
    await db.run('INSERT OR IGNORE INTO blockchain_seals (id,event_type,event_id,data_hash,prev_hash,merkle_root,block_index,nonce,sealed_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(sealTypes),rand(scanIds),dh,prevHash,sha(),i+1,randInt(0,999999),past(randInt(0,30))]);
    prevHash=dh;
  }
  console.log('  ✓ 50 blockchain seals');

  // ═══ 7. PARTNERS (12) ═══
  console.log('🤝 Partners...');
  const partnerDefs=[['TIK Logistics SG','logistics','Singapore','APAC','verified',92,'low'],['EuroDistri GmbH','distributor','Germany','EMEA','verified',88,'low'],['Pacific Trade Hub','distributor','Australia','APAC','verified',85,'medium'],['Saigon Supply Co','manufacturer','Vietnam','APAC','verified',91,'low'],['Amazon FBA US','warehouse','United States','AMER','verified',95,'low'],['Dubai Free Zone','distributor','UAE','MEA','pending',58,'high'],['Nordic Pharma','distributor','Sweden','EMEA','verified',97,'low'],['Shanghai Import','manufacturer','China','APAC','under_review',52,'high'],['Tokyo Express','logistics','Japan','APAC','verified',94,'low'],['Brasil Agro','manufacturer','Brazil','LATAM','pending',67,'medium'],['Mumbai Traders','distributor','India','APAC','verified',78,'medium'],['Hanoi Warehouse','warehouse','Vietnam','APAC','verified',89,'low']];
  const partnerIds=[];
  for(const [n,t,c,r,k,ts,rl] of partnerDefs){
    const pid=uuid(); partnerIds.push(pid);
    await db.run('INSERT OR IGNORE INTO partners (id,name,type,country,region,contact_email,kyc_status,trust_score,risk_level,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [pid,n,t,c,r,`contact@${n.toLowerCase().replace(/[^a-z]/g,'')}.com`,k,ts,rl,'active',past(randInt(30,365))]);
  }
  console.log(`  ✓ ${partnerDefs.length} partners`);

  // ═══ 8. SHIPMENTS (20) ═══
  console.log('🚚 Shipments...');
  const carriers=['DHL Express','FedEx International','Maersk Line','CMA CGM','Singapore Airlines Cargo','Nippon Express','Kuehne+Nagel'];
  const shipIds=[];
  for(let i=0;i<20;i++){
    const sid=uuid(); shipIds.push(sid);
    const st=rand(['delivered','in_transit','in_transit','pending','delivered','customs']);
    let f=randInt(0,partnerIds.length-1), t=randInt(0,partnerIds.length-1);
    if(t===f) t=(t+1)%partnerIds.length;
    await db.run('INSERT OR IGNORE INTO shipments (id,batch_id,from_partner_id,to_partner_id,carrier,tracking_number,status,estimated_delivery,current_lat,current_lng,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [sid,rand(batchIds),partnerIds[f],partnerIds[t],rand(carriers),`TRK-${randInt(1000000,9999999)}`,st,future(randInt(1,14)),rand(geos).la,rand(geos).lo,past(randInt(0,10))]);
  }
  console.log('  ✓ 20 shipments');

  // ═══ 9. IoT READINGS (80) ═══
  console.log('📡 IoT readings...');
  for(let i=0;i<80;i++){
    const st=rand(['temperature','humidity','vibration','light']);
    const u={temperature:'C',humidity:'%',vibration:'g',light:'lux'};
    const r={temperature:[2,8],humidity:[40,60],vibration:[0,2],light:[0,500]};
    const v=randFloat(r[st][0],r[st][1]);
    await db.run('INSERT OR IGNORE INTO iot_readings (id,shipment_id,sensor_type,value,unit,threshold_min,threshold_max,alert_triggered,recorded_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(shipIds),st,v,u[st],r[st][0],r[st][1],(st==='temperature'&&(v<2||v>8))?1:0,past(randInt(0,7))]);
  }
  console.log('  ✓ 80 IoT readings');

  // ═══ 10. SUPPLY CHAIN EVENTS (50) ═══
  console.log('🔗 SCM events...');
  const sceTypes=['manufactured','quality_check','shipped','in_transit','customs_cleared','delivered','received','warehouse_stored','dispatched','label_printed'];
  const sceLocs=['Đà Lạt Factory VN','Singapore Hub','Rotterdam Port NL','JFK Air Cargo NY','Dubai Free Zone','Sydney DC','Tokyo Warehouse','London Fulfilment','Berlin Lab','Zurich Customs'];
  for(let i=0;i<50;i++){
    await db.run('INSERT OR IGNORE INTO supply_chain_events (id,event_type,product_id,batch_id,uid,location,actor,partner_id,details,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(sceTypes),rand(productIds),rand(batchIds),`UID-${Date.now().toString(36).toUpperCase()}-${randInt(1000,9999)}`,rand(sceLocs),rand(['Warehouse Mgr','QA Inspector','Logistics Lead','Customs Agent']),rand(partnerIds),JSON.stringify({temperature:`${randFloat(2,8)}°C`,humidity:`${randInt(40,60)}%`}),past(randInt(0,25))]);
  }
  console.log('  ✓ 50 SCM events');

  // ═══ 11. INVENTORY (15) ═══
  console.log('📋 Inventory...');
  for(const pid of productIds){
    await db.run('INSERT OR IGNORE INTO inventory (id,product_id,batch_id,partner_id,location,quantity,min_stock,max_stock,last_sync,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(),pid,rand(batchIds),rand(partnerIds),rand(sceLocs),randInt(50,2000),randInt(10,50),randInt(1000,5000),past(randInt(0,3)),past(0)]);
  }
  console.log('  ✓ 15 inventory records');

  // ═══ 12. KYC BUSINESSES (10) + CHECKS ═══
  console.log('🏢 KYC...');
  const kycDefs=[['Tony Coffee Factory','VN-BIZ-2024-0891','Vietnam','Agriculture','approved','low'],['Geneva Timepieces SA','CH-HR-2019-4521','Switzerland','Luxury','approved','low'],['Milano Crafts SpA','IT-REA-MI-2012','Italy','Fashion','approved','medium'],['BioHealth Labs Inc','US-DE-2021-8871','United States','Pharma','approved','low'],['Golden Dragon Trading','HK-CR-2023-1234','Hong Kong','Import/Export','pending','high'],['Casablanca Textiles','MA-RC-2022-5678','Morocco','Textiles','under_review','medium'],['Quito Cacao Collective','EC-SRI-2020-9012','Ecuador','Agriculture','approved','low'],['Seoul Glow Labs','KR-BIZ-2022-3456','South Korea','Cosmetics','approved','low'],['Phu Quoc Pepper Farm','VN-BIZ-2023-7890','Vietnam','Agriculture','approved','low'],['Taipei Semi Inc','TW-MOE-2021-5555','Taiwan','Electronics','approved','low']];
  for(const [n,reg,co,ind,st,rl] of kycDefs){
    const bid=uuid();
    await db.run('INSERT OR IGNORE INTO kyc_businesses (id,name,registration_number,country,industry,contact_email,risk_level,verification_status,verified_at,verified_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [bid,n,reg,co,ind,`compliance@${n.toLowerCase().replace(/[^a-z]/g,'')}.com`,rl,st,st==='approved'?past(randInt(15,60)):null,st==='approved'?adminId:null,past(randInt(20,90))]);
    for(const ct of ['identity_verification','sanctions_screening','document_verification','pep_check']){
      await db.run('INSERT OR IGNORE INTO kyc_checks (id,business_id,check_type,provider,status,score,created_at) VALUES (?,?,?,?,?,?,?)',
        [uuid(),bid,ct,'TrustChecker AI',st==='approved'?'passed':st==='pending'?'pending':'in_review',st==='approved'?randFloat(82,100):randFloat(20,60),past(randInt(0,30))]);
    }
  }
  console.log('  ✓ 10 KYC businesses + 40 checks');

  // ═══ 13. CERTIFICATIONS (10) ═══
  console.log('📜 Certifications...');
  const certs=['ISO 9001:2015','ISO 14001:2018','HACCP','GMP','Fair Trade','Organic EU','FDA Approved','CE Marking','ISO 27001','EUDR'];
  for(let i=0;i<10;i++){
    await db.run('INSERT OR IGNORE INTO certifications (id,entity_type,entity_id,cert_name,cert_body,cert_number,issued_date,expiry_date,status,document_hash,added_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(),'product',productIds[i%productIds.length],certs[i],rand(['TÜV Rheinland','SGS','Bureau Veritas','DNV GL']),`CERT-2026-${randInt(10000,99999)}`,past(randInt(30,365)),future(randInt(180,730)),'active',sha(),adminId,past(randInt(0,30))]);
  }
  console.log('  ✓ 10 certifications');

  // ═══ 14. COMPLIANCE RECORDS (12) ═══
  console.log('⚖️ Compliance...');
  const frameworks=['GDPR','ISO27001','FDA','EUDR','SOC2','HACCP'];
  for(let i=0;i<12;i++){
    await db.run('INSERT OR IGNORE INTO compliance_records (id,entity_type,entity_id,framework,requirement,status,evidence,checked_by,next_review,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(),'product',rand(productIds),frameworks[i%frameworks.length],`Requirement ${i+1}`,rand(['compliant','compliant','compliant','non_compliant']),`Evidence document #${randInt(100,999)}`,adminId,future(randInt(30,180)),past(randInt(0,30))]);
  }
  console.log('  ✓ 12 compliance records');

  // ═══ 15. EVIDENCE ITEMS (12) ═══
  console.log('📎 Evidence...');
  const evidDefs=['ISO 9001 Certificate','Lab Analysis Coffee','FDA Compliance Letter','Fair Trade Cert','Chain of Custody Doc','Product Photography','Customs Declaration JP','Sustainability Audit 2026','Swiss COSC Certificate','EU MDR Report','Origin Farm Verification','Blockchain Anchor Proof'];
  for(const t of evidDefs){
    await db.run('INSERT OR IGNORE INTO evidence_items (id,title,description,file_name,file_type,file_size,sha256_hash,entity_type,entity_id,uploaded_by,verification_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(),t,`${t} for Tony is King products`,`${t.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.pdf`,'application/pdf',randInt(200000,8000000),sha(),'product',rand(productIds),adminId,rand(['anchored','verified','verified']),past(randInt(5,45))]);
  }
  console.log('  ✓ 12 evidence items');

  // ═══ 16. ANOMALY DETECTIONS (15) ═══
  console.log('🔍 Anomalies...');
  const anomTypes=[['velocity_spike','high','Scan rate 340% above average'],['geo_anomaly','critical','Impossible location jump'],['scan_pattern_deviation','medium','Shifted to late night'],['trust_score_drop','high','12-point drop in 24h'],['unusual_access_pattern','low','New IP range detected'],['batch_anomaly','medium','2x expected volume']];
  for(let i=0;i<15;i++){
    const a=rand(anomTypes);
    await db.run('INSERT OR IGNORE INTO anomaly_detections (id,source_type,source_id,anomaly_type,severity,score,description,status,detected_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),'scan_event',rand(scanIds),a[0],a[1],randFloat(25,90),a[2],rand(['open','investigating','resolved']),past(randInt(0,10))]);
  }
  console.log('  ✓ 15 anomaly detections');

  // ═══ 17. SUSTAINABILITY SCORES (15) ═══
  console.log('🌿 Sustainability...');
  for(const pid of productIds){
    const sc={c:randFloat(5,40),w:randFloat(10,80),r:randFloat(55,100),e:randFloat(60,100),p:randFloat(40,100),t:randFloat(30,95)};
    const ov=+((sc.r+sc.e+sc.p+sc.t)/4).toFixed(1);
    const g=ov>=90?'A+':ov>=80?'A':ov>=70?'B+':ov>=60?'B':'C';
    await db.run('INSERT OR IGNORE INTO sustainability_scores (id,product_id,carbon_footprint,water_usage,recyclability,ethical_sourcing,packaging_score,transport_score,overall_score,grade,assessed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(),pid,sc.c,sc.w,sc.r,sc.e,sc.p,sc.t,ov,g,past(randInt(0,10))]);
  }
  console.log('  ✓ 15 sustainability scores');

  // ═══ 18. NFT CERTIFICATES (8) ═══
  console.log('🎫 NFTs...');
  for(let i=0;i<8;i++){
    await db.run('INSERT OR IGNORE INTO nft_certificates (id,token_id,product_id,entity_type,entity_id,certificate_type,owner,metadata_hash,status,minted_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [uuid(),20001+i,productIds[i],'product',productIds[i],rand(['authenticity','origin','sustainability','quality']),adminId,sha(),'active',past(randInt(5,20))]);
  }
  console.log('  ✓ 8 NFT certificates');

  // ═══ 19. LEAK ALERTS (6) ═══
  console.log('🔓 Leak alerts...');
  const plats=['Alibaba','DHgate','Wish','Temu','AliExpress','Shopee'];
  for(let i=0;i<6;i++){
    const msrp=randFloat(50,500);
    await db.run('INSERT OR IGNORE INTO leak_alerts (id,product_id,platform,url,listing_title,listing_price,authorized_price,region_detected,leak_type,risk_score,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(productIds),plats[i],`https://${plats[i].toLowerCase()}.com/item/${randInt(100000,999999)}`,`${prodDefs[randInt(0,prodDefs.length-1)][0]} Wholesale`,+(msrp*0.4).toFixed(2),msrp,rand(['China','Nigeria','Turkey','Thailand']),rand(['unauthorized_seller','price_violation','unauthorized_region']),randFloat(0.5,1),rand(['open','investigating']),past(randInt(0,10))]);
  }
  console.log('  ✓ 6 leak alerts');

  // ═══ 20. BILLING & USAGE ═══
  console.log('💳 Billing...');
  const billingUsers=[{id:adminId,plan:'enterprise',limit:50000,api:100000,mb:10240,price:499},{id:userIds['ops_manager'],plan:'pro',limit:10000,api:50000,mb:5120,price:199},{id:userIds['developer'],plan:'starter',limit:2000,api:10000,mb:1024,price:49}];
  for(const b of billingUsers){
    await db.run('INSERT OR IGNORE INTO billing_plans (id,user_id,plan_name,scan_limit,api_limit,storage_mb,price_monthly,status,expires_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),b.id,b.plan,b.limit,b.api,b.mb,b.price,'active',future(365)]);
  }
  const months=['2025-12','2026-01','2026-02'];
  for(const m of months){
    await db.run('INSERT OR IGNORE INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)',[uuid(),adminId,'scans',randInt(800,3000),m,`${m}-28T23:59:59.000Z`]);
    await db.run('INSERT OR IGNORE INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)',[uuid(),adminId,'api_calls',randInt(5000,15000),m,`${m}-28T23:59:59.000Z`]);
    await db.run('INSERT OR IGNORE INTO usage_metrics (id,user_id,metric_type,value,period,created_at) VALUES (?,?,?,?,?,?)',[uuid(),adminId,'storage_mb',randInt(500,2000),m,`${m}-28T23:59:59.000Z`]);
    await db.run('INSERT OR IGNORE INTO invoices (id,user_id,plan_name,amount,currency,status,period_start,period_end,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),adminId,'enterprise',499,'USD','paid',`${m}-01`,`${m}-28`,`${m}-01T00:00:00.000Z`]);
  }
  console.log('  ✓ 3 billing plans + 9 usage metrics + 3 invoices');

  // ═══ 21. SUPPORT TICKETS (5) ═══
  console.log('🎫 Support...');
  const tickets=[['QR scan not working on Android','technical','high'],['Billing inquiry for March','billing','medium'],['How to export compliance report','general','low'],['Partner KYC verification stuck','kyc','high'],['Request for API rate limit increase','api','medium']];
  for(const [subj,cat,pri] of tickets){
    const tid=uuid();
    await db.run('INSERT OR IGNORE INTO support_tickets (id,user_id,subject,description,category,priority,status,created_at) VALUES (?,?,?,?,?,?,?,?)',
      [tid,adminId,subj,`${subj} — detailed description for Tony is King`,cat,pri,rand(['open','in_progress','resolved']),past(randInt(0,14))]);
  }
  console.log('  ✓ 5 support tickets');

  // ═══ 22. AUDIT LOG (40) ═══
  console.log('📝 Audit log...');
  const actions=['user.login','product.create','product.update','scan.validate','alert.investigate','alert.resolve','partner.verify','evidence.upload','kyc.approve','seal.create','report.export','nft.mint','cert.add','settings.update'];
  const allUserIds=Object.values(userIds);
  for(let i=0;i<40;i++){
    const a=rand(actions);
    await db.run('INSERT OR IGNORE INTO audit_log (id,actor_id,action,entity_type,entity_id,ip_address,timestamp) VALUES (?,?,?,?,?,?,?)',
      [uuid(),rand(allUserIds),a,a.split('.')[0],uuid(),`103.${randInt(0,255)}.${randInt(0,255)}.${randInt(1,254)}`,past(randInt(0,14))]);
  }
  console.log('  ✓ 40 audit log entries');

  // ═══ 23. SLA DEFINITIONS (6) ═══
  console.log('📊 SLA...');
  const slaDefs=[['delivery','Delivery Time',48,'hours',500],['quality','Quality Score',95,'percent',1000],['response','Response Time',4,'hours',200],['uptime','System Uptime',99.5,'percent',2000],['customs','Customs Clearance',72,'hours',300],['packaging','Packaging Quality',98,'percent',150]];
  for(const [t,m,th,u,pen] of slaDefs){
    await db.run('INSERT OR IGNORE INTO sla_definitions (id,partner_id,sla_type,metric,threshold_value,threshold_unit,penalty_amount,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),rand(partnerIds),t,m,th,u,pen,'active',past(randInt(30,90))]);
  }
  console.log('  ✓ 6 SLA definitions');

  // ═══ 24. SYSTEM SETTINGS (8) ═══
  console.log('⚙️ System settings...');
  const settings=[['general','company_name','Tony is King'],['general','default_currency','USD'],['security','session_timeout','3600'],['security','max_failed_attempts','5'],['billing','default_plan','starter'],['notifications','email_enabled','true'],['compliance','default_framework','GDPR'],['carbon','emission_unit','kgCO2e']];
  for(const [cat,key,val] of settings){
    await db.run('INSERT OR IGNORE INTO system_settings (id,category,setting_key,setting_value,updated_by,updated_at) VALUES (?,?,?,?,?,?)',
      [uuid(),cat,key,val,adminId,past(0)]);
  }
  console.log('  ✓ 8 system settings');

  // ═══ 25. SUPPLY CHAIN GRAPH (8) ═══
  console.log('🕸️ Supply chain graph...');
  for(let i=0;i<8;i++){
    let f=randInt(0,partnerIds.length-1),t=randInt(0,partnerIds.length-1);
    if(t===f)t=(t+1)%partnerIds.length;
    await db.run('INSERT OR IGNORE INTO supply_chain_graph (id,from_node_id,from_node_type,to_node_id,to_node_type,relationship,weight,risk_score,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [uuid(),partnerIds[f],'partner',partnerIds[t],'partner',rand(['supplies','distributes','manufactures','ships']),randFloat(0.5,1),randFloat(0,0.5),past(randInt(0,60))]);
  }
  console.log('  ✓ 8 graph edges');

  // ═══ 26. DATA RETENTION POLICIES ═══
  console.log('🗂️ Retention policies...');
  for(const [tbl,days,act] of [['scan_events',365,'archive'],['audit_log',2555,'retain'],['fraud_alerts',730,'archive'],['sessions',90,'delete']]){
    await db.run('INSERT OR IGNORE INTO data_retention_policies (id,table_name,retention_days,action,is_active,created_by,created_at) VALUES (?,?,?,?,?,?,?)',
      [uuid(),tbl,days,act,1,adminId,past(30)]);
  }
  console.log('  ✓ 4 retention policies');

  // ═══ DONE ═══
  if(typeof db.save==='function') await db.save();
  console.log(`\n${'═'.repeat(50)}`);
  console.log('🎉 Tony is King — Full seed complete!');
  console.log(`   🏢 Org: ${ORG_NAME}`);
  console.log(`   👤 18 users (password: ${PWD})`);
  console.log(`   📦 15 products + full SCM pipeline`);
  console.log(`   📱 200 scans + 25 fraud alerts + 50 blockchain seals`);
  console.log(`   🤝 12 partners + 20 shipments + 80 IoT readings`);
  console.log(`   📜 KYC + Compliance + Evidence + NFT + Sustainability`);
  console.log(`   💳 Billing + Support + Audit + SLA + Settings`);
  console.log(`${'═'.repeat(50)}`);
  process.exit(0);
}

seed().catch(err=>{console.error('❌ Seed failed:',err);process.exit(1);});
