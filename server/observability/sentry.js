/**
 * Sentry Error Monitoring v9.4.3
 * Initialize early in index.js: require('./observability/sentry');
 */
const DSN = process.env.SENTRY_DSN;

if (DSN) {
    try {
        const Sentry = require('@sentry/node');
        Sentry.init({
            dsn: DSN,
            environment: process.env.NODE_ENV || 'production',
            release: 'trustchecker@9.4.3',
            tracesSampleRate: 0.1,
            profilesSampleRate: 0.1,
            ignoreErrors: [
                'ECONNRESET',
                'EPIPE',
                'socket hang up',
            ],
            beforeSend(event) {
                // Strip sensitive data
                if (event.request?.headers) {
                    delete event.request.headers['authorization'];
                    delete event.request.headers['cookie'];
                }
                return event;
            },
        });

        // Express error handler (add after routes)
        module.exports = {
            Sentry,
            errorHandler: Sentry.Handlers?.errorHandler?.() || ((err, req, res, next) => next(err)),
            requestHandler: Sentry.Handlers?.requestHandler?.() || ((req, res, next) => next()),
        };
        console.log('🔍 Sentry initialized');
    } catch (e) {
        console.warn('⚠️ Sentry init failed:', e.message);
        module.exports = { Sentry: null, errorHandler: (err, req, res, next) => next(err), requestHandler: (req, res, next) => next() };
    }
} else {
    module.exports = { Sentry: null, errorHandler: (err, req, res, next) => next(err), requestHandler: (req, res, next) => next() };
}
