-- ═══════════════════════════════════════════════════════════════════
-- TrustChecker — Realistic Sample Data v2 (schema-verified)
-- Org: 6a2db056-62ec-49ad-8185-16a9021b1b83 (Tony Is King)
-- ═══════════════════════════════════════════════════════════════════

-- No transaction wrapper — each INSERT runs independently

-- ─── 1. PURCHASE ORDERS (+56) ──────────────────────────────────────
INSERT INTO purchase_orders (id, po_number, org_id, supplier, product, quantity, unit, unit_price, total_amount, currency, delivery_date, payment_terms, contract_ref, status, created_by, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  'PO-TIK-' || LPAD((ROW_NUMBER() OVER() + 24)::text, 4, '0'),
  '6a2db056-62ec-49ad-8185-16a9021b1b83',
  (ARRAY['Factory Da Nang #1','Factory Dong Nai #2','Factory Hai Phong #3','Distributor HCMC #32','Distributor Hanoi #35','Distributor Da Nang #33'])[floor(random()*6+1)],
  (ARRAY['Dragon Fruit Premium','Fish Sauce Artisan 500ml','Pho Instant Bowl','Dried Jackfruit Chips','CardioPlus 100mg','VitaKing Multi-Vitamin','Vietnam Robusta 1kg','ImmunoForce Capsule'])[floor(random()*8+1)],
  floor(random()*900+100),
  (ARRAY['pcs','kg','box','carton','pallet'])[floor(random()*5+1)],
  round((random()*45+5)::numeric, 2),
  round((random()*4500+500)::numeric, 2),
  'USD',
  NOW() + (random() * interval '60 days'),
  (ARRAY['NET-30','NET-60','NET-15','COD','LC'])[floor(random()*5+1)],
  'CTR-TIK-' || LPAD(floor(random()*999+1)::text, 3, '0'),
  (ARRAY['draft','submitted','approved','in_transit','delivered','completed'])[floor(random()*6+1)],
  'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4',
  NOW() - (random() * interval '365 days'),
  NOW() - (random() * interval '30 days')
FROM generate_series(1, 56);

-- ─── 2. QUALITY CHECKS (+81) ──────────────────────────────────────
INSERT INTO quality_checks (id, org_id, batch_id, check_type, checkpoint, product, result, score, defects_found, inspector, notes, inspected_at, created_at)
SELECT
  gen_random_uuid()::text, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  (SELECT id FROM batches ORDER BY random() LIMIT 1),
  (ARRAY['incoming','in_process','final','packaging','microbiological','environmental'])[floor(random()*6+1)],
  (ARRAY['receiving_dock','production_line','packaging_area','cold_storage','shipping_bay','lab'])[floor(random()*6+1)],
  (ARRAY['Dragon Fruit Premium','Fish Sauce 500ml','Pho Bowl','Jackfruit Chips','CardioPlus','VitaKing'])[floor(random()*6+1)],
  (ARRAY['pass','pass','pass','pass','minor_defect','fail'])[floor(random()*6+1)],
  round((random()*30+70)::numeric, 1),
  CASE WHEN random()>0.7 THEN floor(random()*5+1) ELSE 0 END,
  (ARRAY['QC Inspector Nguyen','QC Lead Pham','Senior QC Tran','QC Analyst Le'])[floor(random()*4+1)],
  'Routine quality inspection per ISO 9001',
  NOW() - (random() * interval '365 days'),
  NOW() - (random() * interval '365 days')
FROM generate_series(1, 81);

-- ─── 3. DEMAND FORECASTS (+53) ────────────────────────────────────
INSERT INTO demand_forecasts (id, org_id, product_name, period, predicted, actual, confidence, trend, signal, created_at)
SELECT
  gen_random_uuid()::text, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  (ARRAY['Dragon Fruit Premium','Fish Sauce 500ml','Pho Instant Bowl','Dried Jackfruit','CardioPlus 100mg','NeuroCalm 50mg','ImmunoForce Cap','Lacquerware Box','VitaKing Multi','Robusta 1kg'])[floor(random()*10+1)],
  TO_CHAR(DATE_TRUNC('month', NOW() - (m * interval '1 month')), 'YYYY-MM'),
  floor(random()*800+200), CASE WHEN random()>0.3 THEN floor(random()*800+200) ELSE NULL END,
  round((random()*0.3+0.65)::numeric, 2),
  (ARRAY['up','up','stable','stable','down'])[floor(random()*5+1)],
  (ARRAY['strong_buy','buy','hold','reduce','strong_sell'])[floor(random()*5+1)],
  NOW() - (m * interval '1 month')
FROM generate_series(1, 53) AS s(m);

-- ─── 4. FORMAT RULES (+10) ────────────────────────────────────────
INSERT INTO format_rules (id, org_id, field_name, entity_type, pattern, example, description, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  r.f, r.e, r.p, r.x, r.d, true, NOW()-interval '6 months', NOW()
FROM (VALUES
  ('batch_number','batch','TIK-B[0-9]{4}','TIK-B1001','Batch number format'),
  ('serial_number','product','TK-[A-Z]{3}-[0-9]{6}','TK-DFP-000123','Serial number'),
  ('invoice_number','purchase_order','INV-TIK-[0-9]{6}','INV-TIK-000456','Invoice ref'),
  ('lot_code','batch','LOT[0-9]{2}[A-Z]{2}[0-9]{4}','LOT03VN2026','Lot code'),
  ('cert_number','certification','CERT-[A-Z]{2}-[0-9]{4}','CERT-VN-0012','Cert ID'),
  ('warehouse_code','warehouse','WH-[A-Z]{3}-[0-9]{2}','WH-HCM-01','Warehouse ID'),
  ('partner_code','partner','PTR-[A-Z]{2}-[0-9]{3}','PTR-VN-001','Partner ID'),
  ('shipment_tracking','shipment','SHIP-[0-9]{8}','SHIP-20260315','Tracking number'),
  ('qr_prefix','qr_code','QR-TIK-[0-9]{6}','QR-TIK-000789','QR prefix'),
  ('sku_format','product','TK-[A-Z]{2,4}[0-9]{0,3}','TK-DFP','SKU format')
) AS r(f, e, p, x, d);

-- ─── 5. CARBON CREDITS (+19) ─────────────────────────────────────
INSERT INTO carbon_credits (id, credit_id, serial_number, org_id, project_name, project_type, intervention, vintage_year, quantity_tco2e, status, mrv_confidence, evidence_hash, blockchain_status, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  'CC-TIK-' || LPAD((ROW_NUMBER() OVER()+5)::text, 4, '0'),
  'VCS-' || LPAD(floor(random()*99999+10000)::text, 8, '0'),
  '6a2db056-62ec-49ad-8185-16a9021b1b83',
  (ARRAY['Mekong Mangrove Restoration','Highland Reforestation VN','Solar Farm Ninh Thuan','Biogas Mekong Delta','Wind Farm Central Highlands'])[floor(random()*5+1)],
  (ARRAY['forestry','renewable_energy','methane_capture','blue_carbon','energy_efficiency'])[floor(random()*5+1)],
  (ARRAY['tree_planting','solar_install','biogas_capture','mangrove_restore','wind_turbine'])[floor(random()*5+1)],
  2024 + floor(random()*3), round((random()*45+5)::numeric, 1),
  (ARRAY['minted','minted','active','retired','pending'])[floor(random()*5+1)],
  round((random()*0.3+0.7)::numeric, 2), md5(random()::text),
  (ARRAY['confirmed','confirmed','pending','pending'])[floor(random()*4+1)],
  NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days')
FROM generate_series(1, 19);

-- ─── 6. CARBON OFFSETS (+13) ──────────────────────────────────────
INSERT INTO carbon_offsets (id, org_id, offset_type, quantity_tco2e, status, provider, certification, vintage_year, created_at)
SELECT
  gen_random_uuid()::text, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  (ARRAY['reforestation','renewable_energy','methane_capture','energy_efficiency','blue_carbon'])[floor(random()*5+1)],
  round((random()*80+10)::numeric, 1),
  (ARRAY['active','active','verified','retired','pending'])[floor(random()*5+1)],
  (ARRAY['Verra','Gold Standard','CDM','ACR','Plan Vivo'])[floor(random()*5+1)],
  (ARRAY['VCS','Gold Standard','CDM','ACR'])[floor(random()*4+1)],
  2024 + floor(random()*3),
  NOW()-(random()*interval '365 days')
FROM generate_series(1, 13);

-- ─── 7. CARBON ACTIONS (36) ──────────────────────────────────────
INSERT INTO carbon_actions (id, org_id, title, description, category, priority, status, assigned_to, assigned_role, created_by, source_type, source_ref, due_date, completed_at, created_at, updated_at)
SELECT
  gen_random_uuid()::text, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  r.t, r.d, r.c, r.p,
  (ARRAY['open','in_progress','in_progress','completed','completed','completed'])[floor(random()*6+1)],
  (SELECT id FROM users WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  'ops_manager', 'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4', 'manual', '',
  (NOW()+interval '30 days'-(random()*interval '60 days'))::date,
  CASE WHEN random()>0.4 THEN NOW()-(random()*interval '90 days') ELSE NULL END,
  NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days')
FROM (VALUES
  ('Install solar panels warehouse','50kW solar on WH-HCM-01','energy','high'),
  ('Switch to biodiesel fleet','Convert 12 trucks to B20','transport','high'),
  ('LED lighting upgrade Factory','Replace fluorescent with LED','energy','medium'),
  ('Reduce packaging weight 15%','Lighter carton specs','packaging','medium'),
  ('EV charging stations','4 points at distribution center','transport','medium'),
  ('Cold chain optimization','Smart sensors for refrigeration','operations','high'),
  ('Water recycling factory','Closed loop treatment','water','high'),
  ('Green electricity supplier','100% renewable contract','energy','high'),
  ('Mekong mangrove offsets','Purchase 50 tCO2e credits','offset','medium'),
  ('Optimize shipping routes','AI route optimization -12% fuel','transport','medium'),
  ('Supplier carbon audit','Annual carbon footprint top 10','supply_chain','high'),
  ('Smart thermostats','IoT HVAC control all facilities','energy','low'),
  ('Paperless QC docs','Digital checklists replacing paper','operations','low'),
  ('Carbon awareness training','Quarterly sustainability workshops','people','low'),
  ('Green procurement policy','ESG criteria in supplier selection','supply_chain','medium'),
  ('Scope 3 emissions mapping','Full upstream/downstream accounting','reporting','high'),
  ('Rainwater harvesting','Collection for irrigation','water','low'),
  ('Biomass boiler install','Replace gas boiler at factory','energy','high'),
  ('Electric forklift conversion','Replace 8 diesel forklifts','transport','medium'),
  ('Carbon labeling initiative','Product-level carbon labels','marketing','medium'),
  ('Waste-to-energy program','Convert organic waste to biogas','energy','medium'),
  ('Sustainable packaging cert','FSC cert for all packaging','packaging','medium'),
  ('Remote monitoring IoT','Reduce site visits 40%','operations','low'),
  ('Green data center migration','100% renewable cloud provider','digital','medium'),
  ('Supplier decarbonization','Collaborative emission targets','supply_chain','high'),
  ('Carbon budget allocation','Departmental carbon budgets','reporting','high'),
  ('Reusable container program','Replace single-use containers','packaging','medium'),
  ('Zero-waste cafeteria','Eliminate single-use items','people','low'),
  ('LCA automation','Automated lifecycle assessment','reporting','medium'),
  ('Carbon sequestration pilot','Tree planting on company land','offset','low'),
  ('Power factor correction','Reduce reactive power waste','energy','low'),
  ('CNG trial 3 routes','Compressed natural gas pilot','transport','medium'),
  ('Digital twin energy model','Simulate energy scenarios','digital','high'),
  ('Supplier RE incentive','Bonus for green-certified','supply_chain','medium'),
  ('Quarterly carbon review','Exec-level carbon review','reporting','medium'),
  ('Net-zero 2035 roadmap','Public commitment milestones','reporting','high')
) AS r(t, d, c, p);

-- ─── 8. IOT READINGS (500) ───────────────────────────────────────
INSERT INTO iot_readings (id, device_id, reading_type, value, unit, shipment_id, location, recorded_at, org_id)
SELECT
  gen_random_uuid()::text,
  'IOT-' || LPAD(floor(random()*20+1)::text, 3, '0'),
  rt, CASE rt WHEN 'temperature' THEN round((random()*25+2)::numeric,1) WHEN 'humidity' THEN round((random()*40+40)::numeric,1) ELSE round((random()*100)::numeric,1) END,
  CASE rt WHEN 'temperature' THEN '°C' WHEN 'humidity' THEN '%RH' WHEN 'vibration' THEN 'g' WHEN 'light' THEN 'lux' ELSE 'coords' END,
  (SELECT id FROM shipments ORDER BY random() LIMIT 1),
  '{"lat":' || round((random()*10+10)::numeric,4) || ',"lng":' || round((random()*5+105)::numeric,4) || '}',
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 500), LATERAL (SELECT (ARRAY['temperature','humidity','vibration','light','gps'])[floor(random()*5+1)] AS rt) x;

-- ─── 9. PARTNER LOCATIONS (40) ───────────────────────────────────
INSERT INTO partner_locations (id, partner_id, name, address, city, country, lat, lng, type, is_primary, org_id, created_at)
SELECT gen_random_uuid()::text,
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  r.n, r.a, r.c, r.co, r.la, r.lo, r.t, (ROW_NUMBER() OVER()<=10), '6a2db056-62ec-49ad-8185-16a9021b1b83', NOW()-(random()*interval '365 days')
FROM (VALUES
  ('Factory Da Nang','15 Nguyen Van Linh','Da Nang','VN',16.0544,108.2022,'factory'),
  ('Factory Dong Nai','KCN Nhon Trach 3','Bien Hoa','VN',10.9333,106.8333,'factory'),
  ('Factory Hai Phong','Le Chan IZ','Hai Phong','VN',20.8449,106.6881,'factory'),
  ('Factory Binh Duong','VSIP II','Thu Dau Mot','VN',11.05,106.65,'factory'),
  ('Warehouse HCMC','72 Vo Van Kiet D1','HCMC','VN',10.7627,106.6988,'warehouse'),
  ('Warehouse Da Nang','23 Bach Dang','Da Nang','VN',16.0678,108.2208,'warehouse'),
  ('Warehouse Hanoi','45 Tran Duy Hung','Hanoi','VN',21.0085,105.8008,'warehouse'),
  ('Warehouse Singapore','3 Jurong Port Rd','Singapore','SG',1.303,103.747,'warehouse'),
  ('DC HCMC','Tan Binh Industrial','HCMC','VN',10.815,106.6327,'distribution'),
  ('DC Hanoi','Long Bien Logistics','Hanoi','VN',21.0445,105.878,'distribution'),
  ('Farm Lam Dong','Dragon fruit farm','Da Lat','VN',11.9404,108.4583,'farm'),
  ('Farm Binh Thuan','Organic dragon fruit','Phan Thiet','VN',10.9333,108.1,'farm'),
  ('Farm Phu Quoc','Black pepper','Phu Quoc','VN',10.2333,103.9667,'farm'),
  ('Office Hanoi','Trade Tower Ba Dinh','Hanoi','VN',21.0335,105.8154,'office'),
  ('Office HCMC','Bitexco Tower D1','HCMC','VN',10.7716,106.7041,'office'),
  ('Port Cat Lai','Cat Lai Terminal','HCMC','VN',10.7578,106.7631,'port'),
  ('Port Da Nang','Tien Sa Port','Da Nang','VN',16.1127,108.2117,'port'),
  ('Cold Storage HCMC','Cold chain D9','HCMC','VN',10.8231,106.755,'cold_storage'),
  ('Lab HCMC','Testing lab D2','HCMC','VN',10.7875,106.7485,'lab'),
  ('Lab Hanoi','National testing','Hanoi','VN',21.0017,105.8422,'lab'),
  ('Office Tokyo','Shibuya','Tokyo','JP',35.6762,139.6503,'office'),
  ('Office Seoul','Gangnam','Seoul','KR',37.4979,127.0276,'office'),
  ('Highland Coffee','Coffee plantation','Buon Ma Thuot','VN',12.6667,108.05,'farm'),
  ('Mekong Fish Sauce','Production facility','Phu Quoc','VN',10.2167,103.9667,'farm'),
  ('SG Distribution','Changi Logistics','Singapore','SG',1.34,103.975,'distribution'),
  ('Can Tho Plant','Seafood processing','Can Tho','VN',10.0452,105.7469,'factory'),
  ('Retail D1','Flagship store','HCMC','VN',10.7769,106.7009,'retail'),
  ('Retail D7','Phu My Hung outlet','HCMC','VN',10.7294,106.722,'retail'),
  ('Export Terminal','Air cargo terminal','HCMC','VN',10.8189,106.6519,'terminal'),
  ('R&D Center','Product dev lab','HCMC','VN',10.7939,106.7218,'lab'),
  ('Training Center','Staff training','Da Nang','VN',16.047,108.2065,'office'),
  ('Packaging Partner','Carton factory','Binh Duong','VN',11.0253,106.6533,'factory'),
  ('Customs Broker','Customs clearance','HCMC','VN',10.759,106.761,'office'),
  ('Insurance Office','Cargo insurance','HCMC','VN',10.7831,106.699,'office'),
  ('Bank Branch','Trade finance','HCMC','VN',10.7756,106.7019,'office'),
  ('Cert Authority','Certification body','Hanoi','VN',21.0285,105.8542,'office'),
  ('Waste Processing','Recycling partner','Dong Nai','VN',10.948,106.82,'factory'),
  ('Solar Farm','Renewable energy','Ninh Thuan','VN',11.5833,108.9833,'farm'),
  ('Truck Depot','Fleet maintenance','HCMC','VN',10.8525,106.6283,'warehouse'),
  ('IT Data Center','Cloud infra','HCMC','VN',10.7928,106.7095,'office')
) AS r(n, a, c, co, la, lo, t);

-- ─── 10. LEAK ALERTS (25) ────────────────────────────────────────
INSERT INTO leak_alerts (id, product_id, region_detected, authorized_regions, leak_type, risk_score, status, created_at, org_id)
SELECT gen_random_uuid()::text,
  (SELECT id FROM products WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  (ARRAY['Thailand','China','Indonesia','Germany','USA','Cambodia','Myanmar','Laos','Philippines','Malaysia'])[floor(random()*10+1)],
  '["Vietnam","Singapore","Japan","South Korea"]'::jsonb,
  (ARRAY['unauthorized_region','gray_market','parallel_import','counterfeit_suspect','price_arbitrage'])[floor(random()*5+1)],
  round((random()*0.6+0.3)::numeric, 2),
  (ARRAY['open','investigating','confirmed','resolved','false_positive'])[floor(random()*5+1)],
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 25);

-- ─── 11. SLA DEFINITIONS (20) ────────────────────────────────────
INSERT INTO sla_definitions (id, partner_id, sla_type, metric, threshold_value, threshold_unit, penalty_amount, penalty_currency, status, created_at, org_id)
SELECT gen_random_uuid()::text, p.id,
  r.st, r.m, r.tv, r.tu, r.pa, 'USD', 'active', NOW()-interval '6 months', '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM (SELECT id FROM partners LIMIT 10) p
CROSS JOIN LATERAL (VALUES
  ('delivery','on_time_delivery_pct', 95, 'percent', 500),
  ('quality','defect_rate_max', 2, 'percent', 1000)
) AS r(st, m, tv, tu, pa)
LIMIT 20;

-- ─── 12. SLA VIOLATIONS (15) ────────────────────────────────────
INSERT INTO sla_violations (id, sla_id, partner_id, violation_type, actual_value, threshold_value, penalty_amount, status, created_at, org_id)
SELECT gen_random_uuid()::text,
  (SELECT id FROM sla_definitions ORDER BY random() LIMIT 1),
  (SELECT id FROM partners ORDER BY random() LIMIT 1),
  (ARRAY['late_delivery','quality_breach','documentation_gap','response_time'])[floor(random()*4+1)],
  round((random()*20+5)::numeric, 1), round((random()*5+90)::numeric, 1),
  round((random()*500+50)::numeric, 2),
  (ARRAY['open','acknowledged','resolved','waived','escalated'])[floor(random()*5+1)],
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 15);

-- ─── 13. CERTIFICATIONS (35) ────────────────────────────────────
INSERT INTO certifications (id, entity_type, entity_id, cert_name, cert_body, cert_number, issued_date, expiry_date, status, document_hash, added_by, created_at, org_id, version)
SELECT gen_random_uuid()::text, r.et,
  CASE r.et WHEN 'product' THEN (SELECT id FROM products WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1)
  WHEN 'partner' THEN (SELECT id FROM partners ORDER BY random() LIMIT 1)
  ELSE '6a2db056-62ec-49ad-8185-16a9021b1b83' END,
  r.cn, r.cb, 'CERT-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  (NOW()-(random()*interval '730 days'))::date, (NOW()+(random()*interval '730 days'))::date,
  (ARRAY['active','active','active','active','expired','pending_renewal'])[floor(random()*6+1)],
  md5(random()::text), 'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4',
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83', 1
FROM (VALUES
  ('organization','ISO 9001:2015','SGS'),('organization','ISO 14001:2015','Bureau Veritas'),
  ('organization','ISO 22000:2018','TÜV SÜD'),('organization','ISO 27001:2013','BSI Group'),
  ('organization','HACCP','NSF International'),('organization','GMP','BVQI'),
  ('organization','BRC Food Safety','BRC Global'),('organization','FSSC 22000','Foundation FSSC'),
  ('product','Organic','Control Union'),('product','Fair Trade','FairTrade Intl'),
  ('product','Rainforest Alliance','RA'),('product','Non-GMO','Non-GMO Project'),
  ('product','Halal','JAKIM'),('product','Kosher','OU Kosher'),
  ('product','USDA Organic','USDA'),('product','EU Organic','Ecocert'),
  ('product','VietGAP','Ministry of Agriculture VN'),('product','GlobalGAP','GLOBALG.A.P.'),
  ('partner','ISO 9001','SGS'),('partner','ISO 14001','Bureau Veritas'),
  ('partner','HACCP','NSF'),('partner','GMP','TÜV Rheinland'),
  ('partner','SEDEX/SMETA','SEDEX'),('partner','SA8000','SAI'),
  ('product','UTZ Certified','UTZ'),('product','MSC','Marine Stewardship'),
  ('organization','BSCI','amfori'),('organization','Carbon Trust','Carbon Trust'),
  ('product','Vegan','Vegan Society'),('product','Gluten-Free','GFCO'),
  ('partner','WRAP','WRAP'),('partner','C-TPAT','US CBP'),
  ('partner','AEO','Vietnam Customs'),('organization','Sedex','Sedex'),
  ('product','BCI Cotton','Better Cotton')
) AS r(et, cn, cb);

-- ─── 14. KYC BUSINESSES (25) ────────────────────────────────────
INSERT INTO kyc_businesses (id, name, registration_number, country, address, industry, contact_email, contact_phone, risk_level, verification_status, notes, created_at, updated_at, org_id)
SELECT gen_random_uuid()::text, p.name,
  'REG-' || UPPER(SUBSTR(md5(p.id), 1, 8)),
  COALESCE(p.country, 'VN'),
  (ARRAY['123 Industrial Zone','456 Commerce Park','789 Trade Center','321 Business Hub'])[floor(random()*4+1)],
  (ARRAY['manufacturing','distribution','logistics','agriculture','retail','food_processing'])[floor(random()*6+1)],
  LOWER(REPLACE(p.name,' ','')) || '@example.com',
  '+84' || floor(random()*900000000+100000000)::text,
  (ARRAY['low','low','low','medium','medium','high'])[floor(random()*6+1)],
  (ARRAY['verified','verified','verified','pending','under_review'])[floor(random()*5+1)],
  'KYC assessment completed', NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days'),
  '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM partners p LIMIT 25;

-- ─── 15. KYC CHECKS (50) ────────────────────────────────────────
INSERT INTO kyc_checks (id, business_id, check_type, provider, status, result, score, checked_by, created_at, org_id)
SELECT gen_random_uuid()::text,
  (SELECT id FROM kyc_businesses WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  (ARRAY['identity_verification','sanctions_screening','pep_check','adverse_media','financial_health','ownership_structure','regulatory_compliance','trade_reference'])[floor(random()*8+1)],
  (ARRAY['internal','refinitiv','dow_jones','lexisnexis','comply_advantage'])[floor(random()*5+1)],
  (ARRAY['pass','pass','pass','pass','flag','fail'])[floor(random()*6+1)],
  ('{"confidence":' || round((random()*0.3+0.7)::numeric,2) || ',"details":"automated check"}')::jsonb,
  round((random()*40)::numeric, 1),
  (ARRAY['compliance_bot','compliance_officer','external_auditor'])[floor(random()*3+1)],
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 50);

-- ─── 16. SANCTION HITS (8) ──────────────────────────────────────
INSERT INTO sanction_hits (id, business_id, list_name, match_score, matched_entity, details, status, reviewed_by, reviewed_at, created_at, org_id)
SELECT gen_random_uuid()::text,
  (SELECT id FROM kyc_businesses WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  r.ln, r.ms, r.me, ('{"source":"automated_screening","notes":"' || r.me || '"}')::jsonb,
  (ARRAY['pending_review','cleared','confirmed','escalated'])[floor(random()*4+1)],
  CASE WHEN random()>0.3 THEN 'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4' ELSE NULL END,
  CASE WHEN random()>0.3 THEN NOW()-(random()*interval '90 days') ELSE NULL END,
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM (VALUES
  ('OFAC SDN','72.5','Similar Name Trading Co'),('EU Sanctions','65.8','Near Match Import Ltd'),
  ('UN Consolidated','58.3','Partial Name Holdings'),('UK HMT','81.2','Homograph Trading Inc'),
  ('OFAC SDN','69.0','Alias Company Name'),('EU Sanctions','55.7','Possible Link Export'),
  ('VN AML Watchlist','88.1','Local Flagged Entity'),('Interpol Red Notice','76.4','Person of Interest')
) AS r(ln, ms, me);

-- ─── 17. ANOMALY DETECTIONS (40) ────────────────────────────────
INSERT INTO anomaly_detections (id, source_type, source_id, anomaly_type, severity, score, description, details, status, detected_at, resolved_at, org_id)
SELECT gen_random_uuid()::text, r.st, gen_random_uuid()::text, r.at, r.sv,
  round((random()*40+60)::numeric,1), r.d,
  '{"algorithm":"isolation_forest","confidence":' || round((random()*0.3+0.7)::numeric,2) || '}',
  (ARRAY['open','investigating','confirmed','resolved','false_positive'])[floor(random()*5+1)],
  NOW()-(random()*interval '365 days'),
  CASE WHEN random()>0.4 THEN NOW()-(random()*interval '90 days') ELSE NULL END,
  '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM (VALUES
  ('scan_event','velocity_spike','high','847 scans/hour from single IP'),
  ('scan_event','geographic_anomaly','medium','5 countries in 30min for same product'),
  ('scan_event','time_pattern','low','After-hours scanning at DC'),
  ('shipment','route_deviation','high','GPS deviated 150km from route'),
  ('shipment','temperature_breach','critical','28°C for 4 hours in cold chain'),
  ('shipment','delay_pattern','medium','Systematic 48hr delays in Q3'),
  ('inventory','stock_discrepancy','high','Physical count -15% vs system'),
  ('inventory','phantom_inventory','medium','In-stock but not located'),
  ('partner','trust_score_drop','high','Trust score -25pts in 2 weeks'),
  ('partner','financial_anomaly','critical','3x normal invoice amount'),
  ('quality_check','defect_spike','high','Defect rate 1.2% to 8.7%'),
  ('quality_check','measurement_drift','medium','Weight calibration drift'),
  ('purchase_order','price_anomaly','medium','Unit price 40% above market'),
  ('purchase_order','volume_anomaly','low','Volume 3x seasonal average'),
  ('scan_event','duplicate_pattern','medium','Same QR 200+ times in 24hrs'),
  ('scan_event','bot_behavior','high','Automated pattern: 10s intervals'),
  ('shipment','weight_discrepancy','medium','Declared -20% vs actual'),
  ('shipment','seal_tamper','critical','Container seal mismatch'),
  ('partner','certification_gap','medium','ISO 9001 expired 45 days ago'),
  ('partner','ownership_change','high','Beneficial ownership change'),
  ('inventory','expiry_risk','medium','15% stock within 30d expiry'),
  ('quality_check','false_labeling','critical','Nutritional label mismatch'),
  ('scan_event','unknown_device','low','Unregistered device type'),
  ('purchase_order','split_order','medium','Split to avoid approval limit'),
  ('shipment','customs_flag','high','Flagged for extra inspection'),
  ('partner','sanctions_proximity','high','2nd-degree sanctioned link'),
  ('quality_check','allergen_trace','critical','Undeclared allergen found'),
  ('inventory','shrinkage_pattern','medium','2.5% shrinkage over 3 months'),
  ('scan_event','location_impossible','high','HCM+Hanoi scan in 5 minutes'),
  ('shipment','document_mismatch','medium','BOL qty ≠ packing list'),
  ('partner','media_alert','medium','Negative news on labor'),
  ('purchase_order','payment_anomaly','high','Payment to different bank'),
  ('scan_event','counterfeit_signal','critical','Known counterfeit QR pattern'),
  ('quality_check','microbiological','high','E.coli above threshold'),
  ('shipment','over_declaration','low','Customs value +50% vs invoice'),
  ('inventory','fifo_violation','medium','Older stock not dispatched first'),
  ('partner','unresponsive','medium','Non-responsive to audit 30d'),
  ('scan_event','resale_signal','medium','Scans from gray market region'),
  ('quality_check','defect_cluster','low','Defects in specific shift'),
  ('purchase_order','rush_order','low','5 rush orders in 2 weeks')
) AS r(st, at, sv, d);

-- ─── 18. BLOCKCHAIN SEALS (100) ─────────────────────────────────
INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce, sealed_at, org_id)
SELECT gen_random_uuid()::text,
  (ARRAY['product_registration','batch_creation','quality_check','shipment_dispatch','shipment_delivery','scan_verification','certificate_issue','ownership_transfer','recall_notice','audit_completion'])[floor(random()*10+1)],
  gen_random_uuid()::text, md5(random()::text||clock_timestamp()::text),
  md5(random()::text||(clock_timestamp()-interval '1 second')::text),
  md5(random()::text||'merkle'||n::text), n+1000, floor(random()*99999+10000),
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 100) AS s(n);

-- ─── 19. NFT CERTIFICATES (20) ──────────────────────────────────
INSERT INTO nft_certificates (id, token_id, product_id, entity_type, entity_id, certificate_type, issuer, owner, metadata_hash, blockchain_seal_id, status, transfer_history, minted_at, expires_at, org_id)
SELECT gen_random_uuid()::text, n+1000,
  (SELECT id FROM products WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  'product',
  (SELECT id FROM products WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  (ARRAY['authenticity','organic','fair_trade','carbon_neutral','premium_origin'])[floor(random()*5+1)],
  'TrustChecker CA', 'Tony Is King', md5(random()::text),
  (SELECT id FROM blockchain_seals WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  (ARRAY['active','active','active','active','transferred'])[floor(random()*5+1)],
  '[]'::jsonb, NOW()-(random()*interval '365 days'), NOW()+interval '2 years',
  '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 20) AS s(n);

-- ─── 20. SUSTAINABILITY SCORES (30) ─────────────────────────────
INSERT INTO sustainability_scores (id, product_id, carbon_footprint, water_usage, recyclability, ethical_sourcing, packaging_score, transport_score, overall_score, grade, certifications, assessed_by, assessed_at, org_id)
SELECT gen_random_uuid()::text, p.id,
  round((random()*8+0.5)::numeric,2), round((random()*50+5)::numeric,1),
  round((random()*40+60)::numeric,1), round((random()*30+70)::numeric,1),
  round((random()*40+50)::numeric,1), round((random()*35+55)::numeric,1),
  round((random()*30+65)::numeric,1),
  (ARRAY['A+','A','A','B+','B','B','C+','C'])[floor(random()*8+1)],
  '["ISO 14001","Carbon Trust"]'::jsonb,
  'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4',
  NOW()-(random()*interval '180 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM products p WHERE p.org_id='6a2db056-62ec-49ad-8185-16a9021b1b83';

-- ─── 21. SUPPLY CHAIN GRAPH (60) ────────────────────────────────
INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score, metadata, created_at, org_id)
SELECT DISTINCT ON (p1.id, p2.id)
  gen_random_uuid()::text, p1.id, 'partner', p2.id, 'partner',
  (ARRAY['supplies','distributes','transports','inspects'])[floor(random()*4+1)],
  round((random()*0.5+0.5)::numeric,2), round((random()*40+10)::numeric,1),
  ('{"tier":' || floor(random()*3+1) || ',"lead_time_days":' || floor(random()*30+3) || '}')::jsonb,
  NOW()-(random()*interval '365 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM (SELECT id FROM partners ORDER BY random() LIMIT 15) p1
CROSS JOIN (SELECT id FROM partners ORDER BY random() LIMIT 15) p2
WHERE p1.id != p2.id
LIMIT 60;

-- ─── 22. RISK GRAPH NODES (50) ──────────────────────────────────
INSERT INTO risk_graph_nodes (id, entity_type, entity_id, risk_score, metadata, org_id, created_at, updated_at)
SELECT gen_random_uuid()::text, 'partner', p.id,
  round((random()*60+15)::numeric,1),
  ('{"risk_factors":["' || (ARRAY['geographic','regulatory','financial','operational','reputational'])[floor(random()*5+1)] || '","' || (ARRAY['cyber','supply_chain','environmental','compliance','quality'])[floor(random()*5+1)] || '"]}')::jsonb,
  '6a2db056-62ec-49ad-8185-16a9021b1b83',
  NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days')
FROM partners p LIMIT 25;

INSERT INTO risk_graph_nodes (id, entity_type, entity_id, risk_score, metadata, org_id, created_at, updated_at)
SELECT gen_random_uuid()::text, 'product', p.id,
  round((random()*60+15)::numeric,1),
  ('{"risk_factors":["quality","supply_chain"]}')::jsonb,
  '6a2db056-62ec-49ad-8185-16a9021b1b83',
  NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days')
FROM products p WHERE p.org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' LIMIT 25;

-- ─── 23. RISK GRAPH EDGES (80) ──────────────────────────────────
INSERT INTO risk_graph_edges (id, source_id, target_id, relationship, weight, metadata, org_id, created_at)
SELECT gen_random_uuid()::text, n1.id, n2.id,
  (ARRAY['risk_dependency','supply_exposure','financial_linkage','geographic_proximity','shared_infrastructure','ownership_link'])[floor(random()*6+1)],
  round((random()*0.8+0.1)::numeric,2),
  ('{"propagation_factor":' || round((random()*0.5+0.1)::numeric,2) || '}')::jsonb,
  '6a2db056-62ec-49ad-8185-16a9021b1b83', NOW()-(random()*interval '365 days')
FROM risk_graph_nodes n1
CROSS JOIN risk_graph_nodes n2
WHERE n1.id!=n2.id AND n1.org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' AND n2.org_id='6a2db056-62ec-49ad-8185-16a9021b1b83'
ORDER BY random() LIMIT 80;

-- ─── 24. CONTAGION EVENTS (15) ──────────────────────────────────
INSERT INTO contagion_events (id, source_org, affected_org, trust_drop_pct, contagion_impact_pct, severity, action_taken, metadata, created_at)
SELECT gen_random_uuid()::text, o1.id, o2.id,
  round((random()*25+5)::numeric,1), round((random()*15+2)::numeric,1),
  (ARRAY['low','medium','medium','high','critical'])[floor(random()*5+1)],
  (ARRAY['monitoring','investigation','supplier_audit','relationship_review','suspended'])[floor(random()*5+1)],
  ('{"trigger":"' || (ARRAY['quality_incident','regulatory_action','financial_distress','data_breach','environmental_violation'])[floor(random()*5+1)] || '"}')::jsonb,
  NOW()-(random()*interval '365 days')
FROM organizations o1 CROSS JOIN organizations o2
WHERE o1.id!=o2.id ORDER BY random() LIMIT 15;

-- ─── 25. SUPPLIER PROFILES (25) ─────────────────────────────────
INSERT INTO supplier_profiles (id, partner_id, org_id, public_name, slug, description, website, country, certifications, public_trust_score, self_assessment, improvement_plan, is_published, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, '6a2db056-62ec-49ad-8185-16a9021b1b83',
  p.name, LOWER(REPLACE(REPLACE(p.name,' ','-'),'#','')),
  'Trusted partner in Tony Is King supply chain',
  'https://' || LOWER(REPLACE(REPLACE(p.name,' ',''),'#','')) || '.example.com',
  COALESCE(p.country,'VN'), '["ISO 9001"]'::jsonb,
  round((random()*30+65)::numeric,1),
  ('{"completed":true,"score":' || floor(random()*30+70) || '}')::jsonb,
  '{"targets":["reduce_emissions","improve_traceability"]}',
  random()>0.3, NOW()-(random()*interval '365 days'), NOW()-(random()*interval '30 days')
FROM partners p LIMIT 25;

-- ─── 26. QR CODES (+38) ─────────────────────────────────────────
INSERT INTO qr_codes (id, product_id, batch_id, serial_number, status, generated_at, first_scan_at, last_scan_at, scan_count, org_id)
SELECT gen_random_uuid()::text,
  (SELECT id FROM products WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83' ORDER BY random() LIMIT 1),
  (SELECT id FROM batches ORDER BY random() LIMIT 1),
  'QR-TIK-' || LPAD((ROW_NUMBER() OVER()+22)::text, 6, '0'),
  (ARRAY['active','active','active','active','scanned','void'])[floor(random()*6+1)],
  NOW()-(random()*interval '365 days'), NOW()-(random()*interval '300 days'),
  NOW()-(random()*interval '30 days'), floor(random()*500+1),
  '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM generate_series(1, 38);

-- ─── 27. TRUST SCORES (+8) ──────────────────────────────────────
INSERT INTO trust_scores (id, product_id, overall_score, authenticity_score, provenance_score, certification_score, calculated_at, org_id)
SELECT gen_random_uuid()::text, p.id,
  round((random()*25+72)::numeric,1), round((random()*20+78)::numeric,1),
  round((random()*25+70)::numeric,1), round((random()*20+75)::numeric,1),
  NOW()-(random()*interval '30 days'), '6a2db056-62ec-49ad-8185-16a9021b1b83'
FROM products p
WHERE p.org_id='6a2db056-62ec-49ad-8185-16a9021b1b83'
AND p.id NOT IN (SELECT product_id FROM trust_scores WHERE org_id='6a2db056-62ec-49ad-8185-16a9021b1b83')
LIMIT 8;

-- DONE: ~1,400+ records across 27 tables
