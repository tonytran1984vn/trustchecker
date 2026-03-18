#!/usr/bin/env node
/**
 * Daily Merkle Root Anchor
 * Publishes latest blockchain merkle root to external file for tamper evidence
 * Run via cron: 0 2 * * * cd /opt/trustchecker && node scripts/merkle-anchor.js >> logs/merkle-anchor.log
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../server/db');

(async () => {
    try {
        const latest = await db.get('SELECT block_index, data_hash, merkle_root, sealed_at FROM blockchain_seals ORDER BY block_index DESC LIMIT 1');
        if (!latest) { console.log('No blockchain seals found'); process.exit(0); }

        const totalSeals = await db.get('SELECT COUNT(*) as cnt FROM blockchain_seals');
        
        const anchor = {
            timestamp: new Date().toISOString(),
            block_index: latest.block_index,
            data_hash: latest.data_hash,
            merkle_root: latest.merkle_root,
            total_seals: totalSeals.cnt,
            system_hash: crypto.createHash('sha256').update(
                latest.data_hash + latest.merkle_root + totalSeals.cnt
            ).digest('hex')
        };

        // Write to timestamped file
        const dir = path.join(__dirname, '..', 'data', 'merkle-anchors');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const filename = 'anchor-' + new Date().toISOString().split('T')[0] + '.json';
        fs.writeFileSync(path.join(dir, filename), JSON.stringify(anchor, null, 2));
        
        // Also append to running log
        const logLine = JSON.stringify(anchor) + '\n';
        fs.appendFileSync(path.join(dir, 'anchor-log.jsonl'), logLine);
        
        console.log('[' + anchor.timestamp + '] Anchor saved: block ' + anchor.block_index + ', hash ' + anchor.system_hash.substring(0, 16) + '...');
    } catch(e) {
        console.error('Anchor error:', e.message);
    }
    process.exit(0);
})();
