/**
 * v9.5.0: Streaming Export Helper
 * Streams large result sets as CSV without loading all into memory.
 *
 * Usage:
 *   const { streamCSV } = require('../middleware/stream-export');
 *   await streamCSV(res, db, sql, params, columns, filename);
 */

const BATCH_SIZE = 500;

async function streamCSV(res, db, sql, params, columns, filename) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Write header
    res.write(columns.join(',') + '\n');

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const batchSql = `${sql} LIMIT ${BATCH_SIZE} OFFSET ${offset}`;
        const rows = await db.all(batchSql, params);

        if (rows.length === 0) {
            hasMore = false;
            break;
        }

        const csvLines = rows
            .map(row =>
                columns
                    .map(col => {
                        const val = row[col];
                        if (val === null || val === undefined) return '';
                        const str = String(val).replace(/"/g, '""');
                        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
                    })
                    .join(',')
            )
            .join('\n');

        res.write(csvLines + '\n');
        offset += BATCH_SIZE;

        if (rows.length < BATCH_SIZE) hasMore = false;
    }

    res.end();
}

async function streamJSON(res, db, sql, params, wrapKey = 'data') {
    res.setHeader('Content-Type', 'application/json');
    res.write(`{"${wrapKey}":[`);

    let offset = 0;
    let first = true;
    let total = 0;

    while (true) {
        const rows = await db.all(`${sql} LIMIT ${BATCH_SIZE} OFFSET ${offset}`, params);
        if (rows.length === 0) break;

        for (const row of rows) {
            if (!first) res.write(',');
            res.write(JSON.stringify(row));
            first = false;
            total++;
        }

        offset += BATCH_SIZE;
        if (rows.length < BATCH_SIZE) break;
    }

    res.write(`],"total":${total}}`);
    res.end();
}

module.exports = { streamCSV, streamJSON, BATCH_SIZE };
