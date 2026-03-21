/**
 * Boot: Shutdown & Process Error Handlers
 * Graceful shutdown, SIGTERM/SIGINT, unhandled rejections, uncaught exceptions.
 */
const { cache: cacheModule } = require('../cache');
const logger = require('../lib/logger');

function setupShutdown(server, { db, redis, eventBus, partitionManager, waf, replicaManager }) {
    const shutdown = async (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close();
        // Stop event bus & partition scheduler (guard for optional methods)
        if (eventBus?.stop) await eventBus.stop();
        if (partitionManager?.stopScheduler) partitionManager.stopScheduler();
        // v9.4: Stop WAF and read replica health checks
        if (waf?.stop) waf.stop();
        if (replicaManager?.stop) replicaManager.stop();
        // Disconnect database
        if (db.disconnect) await db.disconnect();
        if (redis && redis.disconnect) await redis.disconnect();
        logger.info('Shutdown complete', { cacheStats: await cacheModule.stats() });
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ─── Process Error Handlers ──────────────────────────────────────
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection', { reason: String(reason) });
        // Don't crash — log and continue
    });

    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception — process will exit', { error: err.message, stack: err.stack });
        // Always exit — a corrupted process is worse than a restart
        process.exit(1);
    });
}

module.exports = { setupShutdown };

