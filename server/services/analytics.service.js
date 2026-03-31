const { analyticsEventsQueue } = require('../queues/analytics.queue');

/**
 * Standard Telemetry Publisher bridging the Node.js API to the Asynchronous ELT Data Warehouse Pipeline.
 */
class AnalyticsService {
    /**
     * @param {string} event_type e.g. 'USAGE_TRACKED', 'EXPERIMENT_EXPOSED'
     * @param {number} version
     * @param {string} org_id
     * @param {Object} payload Details of the event (JSON stringified internally)
     */
    static async publishEvent(event_type, version, org_id, payload) {
        try {
            await analyticsEventsQueue.add('log_dw_event', {
                event_type,
                version,
                org_id,
                payload,
                timestamp: new Date().toISOString(),
            });
        } catch (e) {
            console.error('[Analytics Service] Failed to pipeline Telemetry Event:', e.message);
        }
    }
}

module.exports = { AnalyticsService };
