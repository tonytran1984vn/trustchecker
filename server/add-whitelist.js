const db = require('./db');

(async () => {
    try {
        await db.run('ALTER TABLE organizations ADD COLUMN ip_whitelist TEXT DEFAULT "[]"');
        console.log('Column added');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column already exists');
        } else {
            console.error(e);
        }
    }
})();
