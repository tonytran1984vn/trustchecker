// Quick test: export endpoint
const http = require('http');
const d = JSON.stringify({ email: 'admin@tonyisking.com', password: '123qaz12' });
const r = http.request({ hostname: 'localhost', port: 4000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
        const t = JSON.parse(b).token;
        if (!t) { console.log('NO TOKEN:', b.substring(0, 100)); return; }
        // Test CSV export for Pearl Jewelry Set
        http.get({ hostname: 'localhost', port: 4000, path: '/api/products/b5ed1914-4ba5-48c9-bc93-86ebeb274c94/codes/export?format=csv', headers: { 'Authorization': 'Bearer ' + t } }, r2 => {
            let b2 = '';
            r2.on('data', c => b2 += c);
            r2.on('end', () => {
                console.log('CSV EXPORT status:', r2.statusCode);
                console.log('CSV headers:', JSON.stringify(Object.fromEntries(Object.entries(r2.headers).filter(([k]) => k.includes('content')))));
                console.log('CSV first 300 chars:', b2.substring(0, 300));
            });
        });
        // Test PDF export
        http.get({ hostname: 'localhost', port: 4000, path: '/api/products/b5ed1914-4ba5-48c9-bc93-86ebeb274c94/codes/export?format=pdf', headers: { 'Authorization': 'Bearer ' + t } }, r3 => {
            let chunks = [];
            r3.on('data', c => chunks.push(c));
            r3.on('end', () => {
                const buf = Buffer.concat(chunks);
                console.log('\nPDF EXPORT status:', r3.statusCode);
                console.log('PDF size:', buf.length, 'bytes');
                console.log('PDF starts with %PDF:', buf.toString('ascii', 0, 5));
            });
        });
    });
});
r.write(d);
r.end();
