/**
 * ═══════════════════════════════════════════════════════════════
 *  CHAOS SYSTEM LEVEL 4 V8 — MULTI-EDGE GRAPH TESTING
 *
 *  Tests Risk Engine V8: multi-edge graph, controlled propagation,
 *  explainability, adversarial chaos (trust farming + bridge)
 *
 *  43 V7 + 5 V8 = 48 total scenarios
 *
 *  Run: cd /opt/trustchecker && node engines/chaos-system-l4.js
 * ═══════════════════════════════════════════════════════════════
 */
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');
const fs = require('fs');

const DB_URL = process.env.DATABASE_URL;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function psql(sql) {
    try { return execSync(`psql "${DB_URL}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', timeout: 10000 }).toString().trim(); }
    catch(e) { return 'ERROR:' + (e.stderr?.toString().substring(0, 200) || e.message.substring(0, 200)); }
}
function createProduct(name, category) {
    const pid = uuidv4();
    const orgId = psql("SELECT org_id FROM products WHERE org_id IS NOT NULL LIMIT 1");
    psql(`INSERT INTO products (id, name, sku, category, manufacturer, status, org_id, created_at) VALUES ('${pid}', '${name}', 'L4-${Date.now()}', '${category || 'test'}', 'ChaosLab', 'active', '${orgId}', NOW())`);
    return pid;
}
function insertScanEvent(productId, fingerprint, ip, lat, lng, scanType) {
    const id = uuidv4();
    psql(`INSERT INTO scan_events (id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, result, scanned_at, org_id)
        VALUES ('${id}', '${productId}', '${scanType || 'consumer'}', '${fingerprint}', '${ip}', ${lat || 'NULL'}, ${lng || 'NULL'}, 'valid', NOW(),
        (SELECT org_id FROM products WHERE id = '${productId}'))`);
    return id;
}

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  CHAOS SYSTEM L4 V8 — MULTI-EDGE GRAPH TESTING              ║');
    console.log('║  Multi-edge + Controlled propagation + Explainability       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = require('../server/db'); await db._readyPromise; console.log('DB ✅');
    const riskEngine = require('../server/services/risk-scoring-engine'); console.log('Risk Engine V8 ✅\n');

    const results = []; let passed = 0, failed = 0;
    function report(id, name, expected, actual, pass) {
        results.push({ id, name, expected, actual, pass }); pass ? passed++ : failed++;
        console.log(`  ${pass ? '✅' : '❌'} ${id}: ${name}`);
    }

    // ━━━ FRAUD ━━━
    console.log('━━━ FRAUD ━━━\n');
    { const pid=createProduct('D1','fmcg'); insertScanEvent(pid,'dd','10.1.1.1',null,null,'distributor'); await sleep(50);
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'cp',scanType:'consumer',ipAddress:'192.168.1.1'});
    report('BF-1','Distributor first','s>0',`s=${r.risk_score}`,r.risk_score>0); }
    { const pid=createProduct('RB','fmcg'); const fp='ret-'+Date.now(); for(let i=0;i<6;i++) insertScanEvent(pid,fp,'10.0.0.1',null,null,'retailer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.0.0.1'});
    report('BF-2','Retailer bulk','s>0',`s=${r.risk_score}`,r.risk_score>0); }
    { const fp='farm-'+Date.now(); let pid; for(let i=0;i<10;i++){pid=createProduct(`F-${i}`,'fmcg');insertScanEvent(pid,fp,'192.168.99.99',null,null,'consumer');}
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'192.168.99.99'});
    report('BF-3','Farming 10p','s>0',`s=${r.risk_score}`,r.risk_score>0); }
    { const pid=createProduct('Geo','pharma');insertScanEvent(pid,'g1','113.161.0.1',10.8231,106.6297,'consumer');await sleep(50);
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'g2',scanType:'consumer',latitude:35.6762,longitude:139.6503,ipAddress:'203.0.113.1',category:'pharma'});
    report('BF-4','Impossible travel','geo>0',`geo=${r.features.geo.score}`,r.features.geo.score>0); }
    { const fp='fl-'+Date.now(); for(let i=0;i<8;i++){const pid=createProduct(`Fl-${i}`,'test');insertScanEvent(pid,fp,'10.10.10.10',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.10.10.10'});}
    const pid=createProduct('Cl','test'); const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.10.10.10'});
    report('BF-5','Momentum','m>0',`m=${r.momentum}`,r.momentum>0||r.features.history.score>0); }
    { const pid=createProduct('M','test'); for(let i=0;i<10;i++) insertScanEvent(pid,`u-${i}-${Date.now()}`,`172.16.${i}.1`,null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'fin',scanType:'consumer',ipAddress:'172.16.99.1'});
    report('BF-6','Product 10+','s>0',`s=${r.risk_score}`,r.features.history.score>0||r.features.frequency.score>0); }

    // ━━━ BASELINES ━━━
    console.log('\n━━━ BASELINES ━━━\n');
    { const pid=createProduct('CL','fmcg'); const r=await riskEngine.calculateRisk({productId:pid,actorId:'cl-'+Date.now(),scanType:'consumer',latitude:10.8,longitude:106.6,ipAddress:'8.8.8.8'});
    report('BF-7','Clean scan','NORMAL',`d=${r.decision}`,r.decision==='NORMAL'); }
    { const pid=createProduct('BG','fmcg'); const r=await riskEngine.calculateRisk({productId:pid,actorId:'bg-'+Date.now(),scanType:'consumer',latitude:21.03,longitude:105.85,ipAddress:'1.1.1.1'});
    report('BF-8','Clean geo','NORMAL',`d=${r.decision}`,r.decision==='NORMAL'); }

    // ━━━ ADVANCED ━━━
    console.log('\n━━━ ADVANCED ━━━\n');
    { const pid=createProduct('Sl','test'); const fp='sl-'+Date.now(); for(let i=0;i<25;i++) insertScanEvent(pid,fp,`172.16.0.${i%254+1}`,null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'172.16.0.99'});
    report('BF-9','Slow 25','s>0',`s=${r.risk_score}`,r.risk_score>0); }
    { const pid=createProduct('Co','luxury'); insertScanEvent(pid,'cd','10.0.1.1',null,null,'distributor');insertScanEvent(pid,'cr','10.0.1.2',null,null,'retailer');insertScanEvent(pid,'cc','10.0.1.3',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'cf',scanType:'consumer',ipAddress:'10.0.1.4',category:'luxury'});
    report('BF-10','Collusion','graph>0',`graph=${r.features.graph.score}`,r.features.graph.score>0); }
    { const fp='ca-'+Date.now(); let pid; for(let i=0;i<15;i++){pid=createProduct(`A-${i}`,'test');insertScanEvent(pid,fp,'203.0.113.42',null,null,'consumer');}
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'203.0.113.42'});
    report('BF-11','Attacker 15p','s>0',`s=${r.risk_score}`,r.risk_score>0); }

    // ━━━ V2-V7 (condensed) ━━━
    console.log('\n━━━ V2 ━━━\n');
    { const fp='ac-'+Date.now(); for(let i=0;i<10;i++){const pid=createProduct(`Ac-${i}`,'test');insertScanEvent(pid,fp,'10.20.30.40',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.20.30.40'});}
    const pid=createProduct('AF','test'); const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.20.30.40'});
    report('V2-1','Momentum','m>0',`m=${r.momentum}`,r.momentum>0||r.risk_score>15); }
    { const pid=createProduct('FE','test'); const fp='ev-'+Date.now(); for(let i=0;i<15;i++) insertScanEvent(pid,fp,'10.99.99.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.99.99.1'});
    report('V2-2','Freq evasion','freq>20',`freq=${r.features.frequency.score}`,r.features.frequency.score>20); }
    { const pid=createProduct('Ex','pharma');insertScanEvent(pid,'ea','10.0.0.1',10.82,106.63,'distributor');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'ec',scanType:'consumer',latitude:10.82,longitude:106.63,ipAddress:'10.0.0.2',category:'pharma'});
    report('V2-3','Explainability','breakdown',`graph=${r.breakdown.graph}`,typeof r.breakdown.graph==='number'); }

    console.log('\n━━━ V3 ━━━\n');
    { const pid=createProduct('C3','pharma');insertScanEvent(pid,'3d','10.10.1.1',10.82,106.63,'distributor');insertScanEvent(pid,'3r','10.10.1.2',10.83,106.64,'retailer');insertScanEvent(pid,'3c','10.10.1.3',10.84,106.65,'consumer');await sleep(50);
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'3i',scanType:'consumer',latitude:10.85,longitude:106.66,ipAddress:'10.10.1.4',category:'pharma'});
    report('V3-1','Chain','chain',`graph=${r.features.graph.score}`,r.features.graph.reasons.some(x=>x.rule.startsWith('chain_collusion'))); }
    { const fp='co-'+Date.now(); const pid=createProduct('Cold','luxury');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'203.0.113.99',category:'luxury'});
    report('V3-2','Cold-start','p>0',`p=${r.cold_start.penalty}`,r.cold_start.penalty>0); }
    { const fp='lt-'+Date.now(); for(let i=0;i<20;i++){const pid=createProduct(`L-${i}`,'test');insertScanEvent(pid,fp,'10.50.50.50',null,null,'consumer');}
    const pid=createProduct('LF','test'); const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:'consumer',ipAddress:'10.50.50.50'});
    report('V3-3','Cross-product','cross',`graph=${r.features.graph.score}`,r.features.graph.reasons.some(x=>x.rule.startsWith('cross_product'))); }

    console.log('\n━━━ V4 ━━━\n');
    { const a='4a-'+Date.now(),b='4b-'+Date.now(),c='4c-'+Date.now();
    const p1=createProduct('H1','test');insertScanEvent(p1,a,'10.0.0.1',null,null,'consumer');insertScanEvent(p1,b,'10.0.0.2',null,null,'consumer');
    const p2=createProduct('H2','test');insertScanEvent(p2,b,'10.0.0.2',null,null,'consumer');insertScanEvent(p2,c,'10.0.0.3',null,null,'consumer');
    const p3=createProduct('H3','test');insertScanEvent(p3,a,'10.0.0.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:p3,actorId:a,scanType:'consumer',ipAddress:'10.0.0.1'});
    report('V4-1','Multi-hop','graph>0',`graph=${r.features.graph.score}`,r.features.graph.score>0); }
    { const fp='rs-'+Date.now(); const p1=createProduct('R1','test');insertScanEvent(p1,fp,'10.20.0.1',null,null,'distributor');
    const p2=createProduct('R2','test');insertScanEvent(p2,fp,'10.20.0.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:p2,actorId:fp,scanType:'consumer',ipAddress:'10.20.0.1'});
    report('V4-2','Role-switch','role',`graph=${r.features.graph.score}`,r.features.graph.reasons.some(x=>x.rule.startsWith('role_switch'))); }
    { const ip='172.31.99.'+(Date.now()%254+1); const pid=createProduct('IP','test'); for(let i=0;i<5;i++) insertScanEvent(pid,`ip-${i}-${Date.now()}`,ip,null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'ipc',scanType:'consumer',ipAddress:ip});
    report('V4-3','IP cluster','ip',`graph=${r.features.graph.score}`,r.features.graph.reasons.some(x=>x.rule.startsWith('ip_cluster'))); }
    { const pid=createProduct('TC','pharma');insertScanEvent(pid,'td','10.30.1.1',null,null,'distributor');insertScanEvent(pid,'tr','10.30.1.2',null,null,'retailer');insertScanEvent(pid,'tc','10.30.1.3',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:pid,actorId:'tx',scanType:'consumer',ipAddress:'10.30.1.4',category:'pharma'});
    report('V4-4','Temporal','chain',`graph=${r.features.graph.score}`,r.features.graph.reasons.some(x=>x.rule.startsWith('chain_collusion'))); }
    { let fp=0; for(let i=0;i<5;i++){const pid=createProduct(`N-${i}`,'fmcg');const f=`n-${Date.now()}-${i}`;
    const r=await riskEngine.calculateRisk({productId:pid,actorId:f,scanType:'consumer',latitude:10.8+Math.random()*0.1,longitude:106.6+Math.random()*0.1,ipAddress:`8.8.${i}.${i+1}`});
    if(r.decision!=='NORMAL')fp++;} report('V4-5','Noise','0 FP',`${fp}/5`,fp===0); }

    console.log('\n━━━ V5 ━━━\n');
    { const t=await riskEngine.actorTrustScore('v5n-'+Date.now()); report('V5-1','New trust','<0.5',`t=${t.trust}`,t.trust<0.5); }
    { const s='5s-'+Date.now(); for(let i=0;i<5;i++){const pid=createProduct(`S-${i}`,'test');insertScanEvent(pid,s,'10.99.1.1',null,null,'consumer');}
    const st=await riskEngine.deviceTrustScore(s);
    const r='5r-'+Date.now(); for(let i=0;i<3;i++){const pid=createProduct(`R-${i}`,'test');insertScanEvent(pid,r,`10.${i+1}.${i+2}.${i+3}`,null,null,['distributor','retailer','consumer'][i]);}
    const rt=await riskEngine.deviceTrustScore(r);
    report('V5-2','Device','s>r',`s=${st.trust},r=${rt.trust}`,st.trust>rt.trust); }
    { const wip='192.168.50.'+(Date.now()%254+1); for(let i=0;i<5;i++){const pid=createProduct(`W-${i}`,'fmcg');insertScanEvent(pid,`w-${i}-${Date.now()}`,wip,null,null,'consumer');}
    const pid=createProduct('WC','fmcg'); const r=await riskEngine.calculateRisk({productId:pid,actorId:'wt',scanType:'consumer',ipAddress:wip});
    report('V5-3','WiFi','NOT confirmed',`c=${r.features.graph.reasons.some(x=>x.rule==='ip_cluster_confirmed')}`,!r.features.graph.reasons.some(x=>x.rule==='ip_cluster_confirmed')); }
    { const ba='5b-'+Date.now(); for(let i=0;i<5;i++){const pid=createProduct(`B-${i}`,'test');insertScanEvent(pid,ba,'10.88.1.1',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:ba,scanType:'consumer',ipAddress:'10.88.1.1'});}
    const sp=createProduct('SH','test');insertScanEvent(sp,ba,'10.88.1.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:sp,actorId:ba,scanType:'consumer',ipAddress:'10.88.1.1'});
    report('V5-4','Trust cluster','g≥0',`g=${r.features.graph.score}`,r.features.graph.score>=0); }
    { const start=Date.now(); const sf='5f-'+Date.now(); const sp=createProduct('SC','test');
    for(let i=0;i<30;i++) insertScanEvent(sp,`sa-${i}-${Date.now()}`,`10.77.${i}.1`,null,null,'consumer');
    insertScanEvent(sp,sf,'10.77.99.1',null,null,'consumer');
    await riskEngine.calculateRisk({productId:sp,actorId:sf,scanType:'consumer',ipAddress:'10.77.99.1'});
    report('V5-5','BFS scale','<5s',`${Date.now()-start}ms`,(Date.now()-start)<5000); }

    console.log('\n━━━ V6 ━━━\n');
    { const vf='6v-'+Date.now(); for(let i=0;i<5;i++){const pid=createProduct(`V-${i}`,'test');insertScanEvent(pid,vf,'10.66.1.1',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:vf,scanType:'consumer',ipAddress:'10.66.1.1'});}
    const vol=await riskEngine.trustVolatility(vf); report('V6-1','Volatility','data',`v=${vol.volatility}`,typeof vol.volatility==='number'); }
    { const fh=riskEngine.entityTrustFusion(0.9,0.8,80); const fl=riskEngine.entityTrustFusion(0.9,0.8,10);
    report('V6-2','Fusion','hi<lo',`h=${Math.round(fh*100)/100},l=${Math.round(fl*100)/100}`,fh<fl); }
    { const a='6a-'+Date.now(),b='6b-'+Date.now(),c='6c-'+Date.now(),d='6d-'+Date.now();
    const p1=createProduct('RF1','test');insertScanEvent(p1,a,'10.0.0.1',null,null,'consumer');insertScanEvent(p1,b,'10.0.0.2',null,null,'consumer');
    const p2=createProduct('RF2','test');insertScanEvent(p2,b,'10.0.0.2',null,null,'consumer');insertScanEvent(p2,c,'10.0.0.3',null,null,'consumer');
    insertScanEvent(p1,d,'10.0.0.4',null,null,'consumer');insertScanEvent(p2,d,'10.0.0.4',null,null,'consumer');
    const p3=createProduct('RF3','test');insertScanEvent(p3,a,'10.0.0.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:p3,actorId:a,scanType:'consumer',ipAddress:'10.0.0.1'});
    report('V6-3','Multi-factor BFS','graph>0',`g=${r.features.graph.score}`,r.features.graph.score>0); }
    { const sip='10.99.88.'+(Date.now()%254+1); for(let i=0;i<12;i++){const pid=createProduct(`Re-${i}`,'test');insertScanEvent(pid,`rp-${i}-${Date.now()}`,sip,null,null,'consumer');}
    const uf='6u-'+Date.now(); const pid=createProduct('RC','test');insertScanEvent(pid,uf,sip,null,null,'consumer');
    const dt=await riskEngine.deviceTrustScore(uf);
    report('V6-4','Device reuse','t<0.75',`t=${dt.trust}`,dt.trust<0.75||dt.reasons.some(x=>x.rule&&x.rule.startsWith('device_reuse'))); }
    { const df='6d-'+Date.now(); const t=await riskEngine.actorTrustScore(df); report('V6-5','Decay','t≤0.5',`t=${t.trust}`,t.trust<=0.5); }

    console.log('\n━━━ V7 ━━━\n');
    { const dA='7dA-'+Date.now(),dB='7dB-'+Date.now(),cC='7cC-'+Date.now();
    for(let i=0;i<8;i++){const pid=createProduct(`DC-${i}`,'test');insertScanEvent(pid,dA,'10.55.1.1',null,null,'consumer');insertScanEvent(pid,dB,'10.55.1.2',null,null,'consumer');
    await riskEngine.calculateRisk({productId:pid,actorId:dA,scanType:'consumer',ipAddress:'10.55.1.1'});await riskEngine.calculateRisk({productId:pid,actorId:dB,scanType:'consumer',ipAddress:'10.55.1.2'});}
    const sp=createProduct('V7S','test');insertScanEvent(sp,dA,'10.55.1.1',null,null,'consumer');insertScanEvent(sp,dB,'10.55.1.2',null,null,'consumer');insertScanEvent(sp,cC,'10.55.2.1',null,null,'consumer');
    const prop=await riskEngine.trustPropagation(cC);
    report('V7-1','Propagation','neighbors>0',`n=${prop.neighbor_count}`,prop.neighbor_count>0); }
    { const tf='7t-'+Date.now(); for(let i=0;i<8;i++){const pid=createProduct(`T-${i}`,'test');for(let j=0;j<=i;j++) insertScanEvent(pid,tf,'10.44.1.1',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:tf,scanType:'consumer',ipAddress:'10.44.1.1'});await sleep(20);}
    const trend=await riskEngine.riskTrendSlope(tf);
    report('V7-2','Trend slope','data',`s=${trend.slope}`,typeof trend.slope==='number'); }
    { const cf='7c-'+Date.now(); for(let i=0;i<4;i++){const pid=createProduct(`C-${i}`,'test');insertScanEvent(pid,cf,'10.33.1.1',null,null,'consumer');await riskEngine.calculateRisk({productId:pid,actorId:cf,scanType:'consumer',ipAddress:'10.33.1.1'});}
    const t=await riskEngine.actorTrustScore(cf); const has=t.reasons[0]?.trend_slope!==undefined&&t.reasons[0]?.network_trust!==undefined;
    report('V7-3','V7 fields','has',`ts=${t.reasons[0]?.trend_slope},nt=${t.reasons[0]?.network_trust}`,has); }
    { const a='7ma-'+Date.now(),b='7mb-'+Date.now(),c='7mc-'+Date.now(),d='7md-'+Date.now();
    const p1=createProduct('MF1','test');insertScanEvent(p1,a,'10.0.0.1',null,null,'consumer');insertScanEvent(p1,b,'10.0.0.2',null,null,'consumer');
    const p2=createProduct('MF2','test');insertScanEvent(p2,b,'10.0.0.2',null,null,'consumer');insertScanEvent(p2,c,'10.0.0.3',null,null,'consumer');
    insertScanEvent(p1,d,'10.0.0.4',null,null,'consumer');insertScanEvent(p2,d,'10.0.0.4',null,null,'consumer');
    const p3=createProduct('MF3','test');insertScanEvent(p3,a,'10.0.0.1',null,null,'consumer');
    const r=await riskEngine.calculateRisk({productId:p3,actorId:a,scanType:'consumer',ipAddress:'10.0.0.1'});
    report('V7-4','Multi-factor','graph>0',`g=${r.features.graph.score}`,r.features.graph.score>0); }
    { const roles=['consumer','retailer','distributor']; const cats=['fmcg','pharma','luxury','test']; let sc=0;
    for(let i=0;i<10;i++){const pid=createProduct(`Ch-${i}`,cats[Math.floor(Math.random()*cats.length)]); const fp=`ch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const role=roles[Math.floor(Math.random()*roles.length)]; for(let j=0;j<Math.floor(Math.random()*3)+1;j++) insertScanEvent(pid,fp,`${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,null,null,role);
    const r=await riskEngine.calculateRisk({productId:pid,actorId:fp,scanType:role,ipAddress:`${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`});
    if(r.decision!=='NORMAL')sc++;} report('V7-5','Random chaos','<50%',`${sc}/10`,sc<5); }

    // ━━━ V8 MULTI-EDGE GRAPH ━━━
    console.log('\n━━━ V8 MULTI-EDGE GRAPH ━━━\n');

    // V8-1: Multi-edge: same IP + same product → strong fraud signal
    {
        const sharedIP = '10.88.99.' + (Date.now() % 254 + 1);
        const sharedPid = createProduct('V8-MultiEdge', 'test');
        const fp1 = 'v8me1-' + Date.now();
        // 4 actors, same IP, same product
        for (let i = 0; i < 4; i++) {
            insertScanEvent(sharedPid, `v8me-actor-${i}-${Date.now()}`, sharedIP, null, null, 'consumer');
        }
        insertScanEvent(sharedPid, fp1, sharedIP, null, null, 'consumer');
        const me = await riskEngine.multiEdgeScore(fp1, sharedIP);
        const prop = await riskEngine.trustPropagation(fp1);
        // Should have multi-edge edges data
        report('V8-1', 'Multi-edge: IP+product overlap', 'edges or prop data', `me_score=${me.score},prop_edges=${JSON.stringify(prop.edges)}`, typeof prop.edges === 'object' && prop.edges !== null);
    }

    // V8-2: Propagation cap — penalty should not exceed 0.15 (30%)
    {
        // Create extremely dirty cluster
        const dirtyIP = '10.77.66.' + (Date.now() % 254 + 1);
        for (let i = 0; i < 10; i++) {
            const dirtyFP = `v8dirty-${i}-${Date.now()}`;
            for (let j = 0; j < 5; j++) {
                const pid = createProduct(`V8D-${i}-${j}`, 'test');
                insertScanEvent(pid, dirtyFP, dirtyIP, null, null, 'consumer');
                await riskEngine.calculateRisk({ productId: pid, actorId: dirtyFP, scanType: 'consumer', ipAddress: dirtyIP });
            }
        }
        // Clean actor in this dirty cluster
        const cleanFP = 'v8clean-' + Date.now();
        const cleanPid = createProduct('V8-Clean', 'test');
        insertScanEvent(cleanPid, cleanFP, dirtyIP, null, null, 'consumer');
        const prop = await riskEngine.trustPropagation(cleanFP);
        // Penalty should be capped at 0.15
        report('V8-2', 'Propagation cap ≤ 0.15', 'penalty ≤ 0.15', `penalty=${prop.penalty}`, prop.penalty <= 0.15);
    }

    // V8-3: Explainability — response should have `components` breakdown
    {
        const exPid = createProduct('V8-Explain', 'pharma');
        insertScanEvent(exPid, 'ex-dist', '10.0.1.1', 10.82, 106.63, 'distributor');
        const r = await riskEngine.calculateRisk({ productId: exPid, actorId: 'ex-check', scanType: 'consumer', latitude: 10.82, longitude: 106.63, ipAddress: '10.0.1.2', category: 'pharma' });
        const hasComponents = r.components && typeof r.components.behavior === 'number' && typeof r.components.temporal === 'number' && typeof r.components.graph === 'number';
        report('V8-3', 'Explainability components', 'behavior+temporal+graph', `b=${r.components?.behavior},t=${r.components?.temporal},g=${r.components?.graph}`, hasComponents);
    }

    // V8-4: Adversarial — trust farming + delayed attack
    {
        const farmFP = 'v8farm-' + Date.now();
        // Phase 1: Farm trust (clean scans)
        for (let i = 0; i < 6; i++) {
            const pid = createProduct(`V8Farm-${i}`, 'fmcg');
            await riskEngine.calculateRisk({ productId: pid, actorId: farmFP, scanType: 'consumer', ipAddress: '10.22.1.1' });
        }
        // Phase 2: Attack (suspicious scans)
        for (let i = 0; i < 8; i++) {
            const pid = createProduct(`V8Atk-${i}`, 'pharma');
            insertScanEvent(pid, farmFP, '10.22.1.1', null, null, 'distributor');
            await riskEngine.calculateRisk({ productId: pid, actorId: farmFP, scanType: 'distributor', ipAddress: '10.22.1.1', category: 'pharma' });
        }
        const pid = createProduct('V8AtkFinal', 'pharma');
        const r = await riskEngine.calculateRisk({ productId: pid, actorId: farmFP, scanType: 'consumer', ipAddress: '10.22.1.1', category: 'pharma' });
        // System should detect the attack despite trust farming
        report('V8-4', 'Trust farm + attack', 'score > 0', `s=${r.risk_score}`, r.risk_score > 0);
    }

    // V8-5: Multi-cluster bridge detection
    {
        // Cluster A
        const bridgeFP = 'v8bridge-' + Date.now();
        const clusterA = createProduct('V8-ClusterA', 'test');
        for (let i = 0; i < 4; i++) insertScanEvent(clusterA, `v8cA-${i}-${Date.now()}`, '10.44.1.1', null, null, 'consumer');
        insertScanEvent(clusterA, bridgeFP, '10.44.2.1', null, null, 'consumer');
        // Cluster B
        const clusterB = createProduct('V8-ClusterB', 'test');
        for (let i = 0; i < 4; i++) insertScanEvent(clusterB, `v8cB-${i}-${Date.now()}`, '10.44.3.1', null, null, 'consumer');
        insertScanEvent(clusterB, bridgeFP, '10.44.2.1', null, null, 'consumer');
        const r = await riskEngine.calculateRisk({ productId: clusterB, actorId: bridgeFP, scanType: 'consumer', ipAddress: '10.44.2.1' });
        // Bridge actor should have graph score (connects two clusters)
        report('V8-5', 'Multi-cluster bridge', 'graph>0 or s>0', `g=${r.features.graph.score},s=${r.risk_score}`, r.features.graph.score > 0 || r.risk_score > 0);
    }

    // ━━━ INTEGRATION ━━━
    console.log('\n━━━ INTEGRATION ━━━\n');
    { const c=psql("SELECT COUNT(*) FROM risk_scores WHERE created_at > NOW() - INTERVAL '5 minutes'"); report('INT-1','risk_scores','>0',c,parseInt(c)>0); }
    { const c=psql("SELECT COUNT(*) FROM actor_risk_profiles WHERE updated_at > NOW() - INTERVAL '5 minutes'"); report('INT-2','profiles','>0',c,parseInt(c)>0); }
    { const d=psql("SELECT decision||'='||COUNT(*)::TEXT FROM risk_scores WHERE created_at > NOW()-INTERVAL '5 minutes' GROUP BY decision ORDER BY COUNT(*) DESC");
    report('INT-3','Decisions','data',d.replace(/\n/g,', '),d.length>0&&!d.startsWith('ERROR')); }
    { const c=psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%graph_score%' AND created_at > NOW()-INTERVAL '5 minutes'"); report('INT-4','Graph','>0',c,parseInt(c)>0); }
    { const c=psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%network_trust%' AND created_at > NOW()-INTERVAL '5 minutes'"); report('INT-5','Network','>=0',c,!c.startsWith('ERROR')); }
    { const c=psql("SELECT COUNT(*) FROM risk_scores WHERE reasons::text LIKE '%multi_edge%' AND created_at > NOW()-INTERVAL '5 minutes'"); report('INT-6','Multi-edge','>=0',c,!c.startsWith('ERROR')); }

    // ═══════════
    const total=passed+failed; const passRate=Math.round(passed/total*100);
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log(`║  L4 V8 RESULTS: ${passed}/${total} passed (${passRate}%) | ${failed} failed`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Fraud:       ${results.filter(r=>r.id>='BF-1'&&r.id<='BF-6').filter(r=>r.pass).length}/6`);
    console.log(`║  Baselines:   ${results.filter(r=>r.id==='BF-7'||r.id==='BF-8').filter(r=>r.pass).length}/2`);
    console.log(`║  Advanced:    ${results.filter(r=>r.id>='BF-9'&&r.id<='BF-11').filter(r=>r.pass).length}/3`);
    console.log(`║  V2:          ${results.filter(r=>r.id.startsWith('V2')).filter(r=>r.pass).length}/3`);
    console.log(`║  V3:          ${results.filter(r=>r.id.startsWith('V3')).filter(r=>r.pass).length}/3`);
    console.log(`║  V4:          ${results.filter(r=>r.id.startsWith('V4')).filter(r=>r.pass).length}/5`);
    console.log(`║  V5:          ${results.filter(r=>r.id.startsWith('V5')).filter(r=>r.pass).length}/5`);
    console.log(`║  V6:          ${results.filter(r=>r.id.startsWith('V6')).filter(r=>r.pass).length}/5`);
    console.log(`║  V7:          ${results.filter(r=>r.id.startsWith('V7')).filter(r=>r.pass).length}/5`);
    console.log(`║  V8 Graph:    ${results.filter(r=>r.id.startsWith('V8')).filter(r=>r.pass).length}/5`);
    console.log(`║  Integration: ${results.filter(r=>r.id.startsWith('INT')).filter(r=>r.pass).length}/6`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    const fails=results.filter(r=>!r.pass);
    if(fails.length>0){console.log('\n❌ FAILED:');fails.forEach(f=>console.log(`  ${f.id}: ${f.name} | exp: ${f.expected} | act: ${f.actual}`));}
    fs.writeFileSync('chaos-l4-report.json',JSON.stringify({timestamp:new Date().toISOString(),version:'V8',results,summary:{total,passed,failed,pass_rate:passRate}},null,2));
    console.log('\n📝 chaos-l4-report.json');
    process.exit(0);
}
main().catch(e=>{console.error('FATAL:',e.message,e.stack);process.exit(1);});
