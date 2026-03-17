const http = require('http');

function request(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { reject(new Error('TIMEOUT')); }, 5000);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const data = body ? JSON.stringify(body) : '';
        if (data) headers['Content-Length'] = Buffer.byteLength(data);
        const req = http.request({ hostname: 'localhost', port: 4000, path, method, headers }, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => { clearTimeout(timer); try { resolve({ status: res.statusCode, body: JSON.parse(d) }) } catch (e) { resolve({ status: res.statusCode, body: { raw: d.slice(0, 100) } }) } });
        });
        req.on('error', e => { clearTimeout(timer); reject(e); });
        if (data) req.write(data);
        req.end();
    });
}

(async () => {
    try {
        const ts = Date.now();
        const reg = await request('POST', '/api/auth/register', null, { username: 'v9t_' + ts, email: 'v9t_' + ts + '@t.com', password: 'TestV9P@ss2026!' });
        const token = reg.body.token;
        if (!token) { console.log('REGISTER FAILED:', JSON.stringify(reg.body)); process.exit(1); }
        console.log('Token: ' + token.slice(0, 20) + '...\n');

        const endpoints = [
            '/api/health', '/api/public/stats', '/api/public/scan-trends', '/api/public/trust-distribution',
            '/api/qr/dashboard-stats', '/api/products', '/api/qr/blockchain', '/api/notifications',
            '/api/scm/dashboard', '/api/scm/inventory', '/api/scm/inventory/forecast', '/api/scm/shipments',
            '/api/scm/sla/violations', '/api/scm/optimization', '/api/scm/partners', '/api/scm/leaks/stats',
            '/api/scm/graph/analysis', '/api/kyc/stats', '/api/kyc/businesses', '/api/evidence/stats',
            '/api/trust/dashboard', '/api/billing/plan', '/api/billing/usage', '/api/billing/invoices',
            '/api/reports/templates', '/api/branding', '/api/nft',
            '/api/anomaly', '/api/sustainability/stats', '/api/sustainability/leaderboard',
            '/api/compliance/stats', '/api/compliance/records', '/api/compliance/retention',
            '/api/scm/epcis/events', '/api/scm/epcis/stats', '/api/scm/epcis/document',
            '/api/scm/ai/forecast-demand', '/api/scm/ai/demand-sensing', '/api/scm/ai/delay-root-cause',
            '/api/scm/risk/radar', '/api/scm/risk/heatmap', '/api/scm/risk/alerts', '/api/scm/risk/trends',
            '/api/scm/carbon/scope', '/api/scm/carbon/leaderboard', '/api/scm/carbon/report',
            '/api/scm/twin/model', '/api/scm/twin/kpis', '/api/scm/twin/anomalies'
        ];

        let pass = 0, fail = 0, errs = [];
        for (const ep of endpoints) {
            try {
                const r = await request('GET', ep, token);
                if (r.status === 200) { pass++; process.stdout.write('✅ ' + ep + '\n'); }
                else { fail++; process.stdout.write('❌ ' + r.status + ' ' + ep + '\n'); errs.push(ep + ' → ' + r.status); }
            } catch (e) {
                fail++; process.stdout.write('💥 TIMEOUT ' + ep + '\n'); errs.push(ep + ' → ' + e.message);
            }
        }
        console.log('\n═══════════════════════════════');
        console.log('PASS: ' + pass + ' | FAIL: ' + fail + ' | TOTAL: ' + (pass + fail));
        console.log('═══════════════════════════════');
        if (errs.length) console.log('Errors:\n' + errs.join('\n'));
        process.exit(0);
    } catch (e) { console.error('Fatal:', e.message); process.exit(1); }
})();
