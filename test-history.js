// Test generation-history endpoint with company admin account
const http = require('http');

function req(opts, body) {
    return new Promise((resolve, reject) => {
        const r = http.request({ hostname: 'localhost', port: 4000, ...opts }, res => {
            let b = ''; res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, body: b }));
        });
        r.on('error', reject);
        if (body) r.write(body);
        r.end();
    });
}

(async () => {
    // 1. Login with company admin
    const loginBody = JSON.stringify({ email: 'admin@tonyisking.com', password: '123qaz12' });
    const login = await req({ path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) } }, loginBody);
    console.log('LOGIN status:', login.status);

    if (login.status === 429) {
        console.log('RATE LIMITED:', login.body.substring(0, 200));
        console.log('Trying to continue anyway...');
    }

    let token;
    try { token = JSON.parse(login.body).token; } catch (e) { }

    if (!token) {
        console.log('NO TOKEN, trying raw DB query instead...');
        // Just check if qr_codes exist at all
        process.exit(1);
    }

    // 2. Test generation-history
    console.log('\n--- generation-history ---');
    const hist = await req({ path: '/api/products/generation-history', headers: { 'Authorization': 'Bearer ' + token } });
    console.log('STATUS:', hist.status);
    console.log('BODY:', hist.body.substring(0, 2000));

    // 3. Test products list
    console.log('\n--- products ---');
    const prods = await req({ path: '/api/products?limit=3', headers: { 'Authorization': 'Bearer ' + token } });
    console.log('STATUS:', prods.status);
    console.log('BODY:', prods.body.substring(0, 500));

    // 4. Test codes for first product
    let firstProductId;
    try {
        const parsed = JSON.parse(prods.body);
        const prodList = parsed.products || parsed;
        firstProductId = prodList[0]?.id;
        console.log('\nFirst product ID:', firstProductId);
    } catch (e) { console.log('parse error'); }

    if (firstProductId) {
        console.log('\n--- codes for product ---');
        const codes = await req({ path: '/api/products/' + firstProductId + '/codes', headers: { 'Authorization': 'Bearer ' + token } });
        console.log('STATUS:', codes.status);
        console.log('BODY:', codes.body.substring(0, 500));
    }
})().catch(e => console.error('ERROR:', e));
