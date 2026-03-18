/**
 * Playwright Global Auth Setup
 * Logs in ONCE before all tests and stores token in a file.
 * All test files read from this file instead of calling login API.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const TOKEN_FILE = path.join(__dirname, '.auth-token');
const BASE_URL = process.env.TEST_URL || 'https://tonytran.work';

async function globalSetup() {
    const url = new URL('/api/auth/login', BASE_URL);
    const data = JSON.stringify({
        email: 'owner@tonyisking.com',
        password: '123qaz12',
    });

    return new Promise((resolve, reject) => {
        const proto = url.protocol === 'https:' ? require('https') : http;
        const req = proto.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            rejectUnauthorized: false,
            timeout: 15000,
        }, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    const token = json.token || json.data?.token;
                    if (token) {
                        fs.writeFileSync(TOKEN_FILE, token);
                        console.log('[global-setup] Auth token saved (' + token.substring(0, 20) + '...)');
                        resolve();
                    } else {
                        console.error('[global-setup] No token in response:', body.substring(0, 100));
                        reject(new Error('Login failed: no token'));
                    }
                } catch (e) {
                    console.error('[global-setup] Parse error:', e.message);
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

module.exports = globalSetup;
