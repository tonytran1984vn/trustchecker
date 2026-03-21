/**
 * Reset passwords for all test users on VPS
 * Run: node /var/www/trustchecker/reset-passwords.js
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

(async () => {
    // Find the DB file
    const possiblePaths = [
        path.join(__dirname, 'data', 'trustchecker.db'),
        path.join(__dirname, 'trustchecker.db'),
        path.join(__dirname, 'server', 'data', 'trustchecker.db'),
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) { dbPath = p; break; }
    }

    if (!dbPath) {
        // Search for .db files
        const { execSync } = require('child_process');
        const result = execSync('find /var/www/trustchecker -name "*.db" -type f 2>/dev/null').toString();
        console.log('DB files found:', result);
        console.log('ERROR: Could not find trustchecker.db');
        process.exit(1);
    }

    console.log('Found DB at:', dbPath);

    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(dbPath);
    const db = new SQL.Database(buf);

    // Password reset map
    const resets = [
        ['admin@trustchecker.io', 'Admin@123456!'],
        ['admin@demo.trustchecker.io', 'CompanyAdmin2026!@#'],
        ['ceo@demo.trustchecker.io', 'TestCeo2026!@#'],
        ['ops@demo.trustchecker.io', 'TestOps2026!@#'],
        ['risk@demo.trustchecker.io', 'TestRisk2026!@#'],
        ['compliance@demo.trustchecker.io', 'TestCompliance2026!@#'],
        ['dev@demo.trustchecker.io', 'TestDev2026!@#'],
        ['ggc@demo.trustchecker.io', 'TestGgc2026!@#'],
        ['riskcom@demo.trustchecker.io', 'TestRiskCom2026!@#'],
        ['ivu@demo.trustchecker.io', 'TestIvu2026!@#'],
        ['scm@demo.trustchecker.io', 'TestScm2026!@#'],
        ['blockchain@demo.trustchecker.io', 'TestBlockchain2026!@#'],
        ['carbon@demo.trustchecker.io', 'TestCarbon2026!@#'],
        ['security@trustchecker.io', 'PlatformSec2026!@#'],
        ['datagov@trustchecker.io', 'DataGov2026!@#'],
        ['auditor@demo.trustchecker.io', 'TestAuditor2026!@#'],
    ];

    for (const [email, password] of resets) {
        const hash = await bcrypt.hash(password, 12);
        db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
        console.log('  ✓', email);
    }

    // Save back to disk
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log('\n✅ All passwords reset and saved (' + buffer.length + ' bytes)');

    // Verify
    const user = db.exec("SELECT email, password_hash FROM users WHERE email = 'admin@trustchecker.io'");
    if (user[0] && user[0].values[0]) {
        const match = await bcrypt.compare('Admin@123456!', user[0].values[0][1]);
        console.log('Verify admin login:', match ? '✅ PASS' : '❌ FAIL');
    }

    process.exit(0);
})();
