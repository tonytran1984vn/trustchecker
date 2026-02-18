/**
 * Boot: Shutdown & Process Error Handlers
 * Graceful shutdown, SIGTERM/SIGINT, unhandled rejections, uncaught exceptions.
 */
const { cache: cacheModule } = require('../cache');

function setupShutdown(server, { db, redis, eventBus, partitionManager, waf, replicaManager }) {
    const shutdown = async (signal) => {
        console.log(`\n🔻 ${signal} received — shutting down gracefully...`);
        server.close();
        // Stop event bus & partition scheduler (guard for optional methods)
        if (eventBus?.stop) await eventBus.stop();
        if (partitionManager?.stopScheduler) partitionManager.stopScheduler();
        // v9.4: Stop WAF and read replica health checks
        if (waf?.stop) waf.stop();
        if (replicaManager?.stop) replicaManager.stop();
        // Save database before disconnecting
        if (db.save) {
            try { db.save(); console.log('💾 Database saved'); }
            catch (e) { console.error('DB save failed:', e.message); }
        }
        if (db.disconnect) await db.disconnect();
        if (redis && redis.disconnect) await redis.disconnect();
        console.log(`📊 Final cache stats:`, await cacheModule.stats());
        console.log('✅ Shutdown complete');
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ─── Process Error Handlers ──────────────────────────────────────
    process.on('unhandledRejection', (reason, promise) => {
        console.error('⚠️ Unhandled Promise Rejection:', reason);
        // Don't crash — log and continue
    });

    process.on('uncaughtException', (err) => {
        console.error('💥 Uncaught Exception:', err);
        // Save DB before crash
        if (db.save) {
            try { db.save(); } catch (e) { /* noop */ }
        }
        // Always exit — a corrupted process is worse than a restart
        process.exit(1);
    });
}

module.exports = { setupShutdown };
