/**
 * Structured Logger v1.0 (A-05)
 * JSON-formatted logs with levels, timestamps, and context.
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] ?? 2;

function log(level, message, meta = {}) {
    if (LOG_LEVELS[level] > CURRENT_LEVEL) return;

    const entry = {
        '@timestamp': new Date().toISOString(),
        level,
        message,
        service: 'trustchecker',
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
        ...meta,
    };

    const output = JSON.stringify(entry);
    if (level === 'error') process.stderr.write(output + '\n');
    else process.stdout.write(output + '\n');
}

module.exports = {
    error: (msg, meta) => log('error', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    debug: (msg, meta) => log('debug', msg, meta),
    log,
};
