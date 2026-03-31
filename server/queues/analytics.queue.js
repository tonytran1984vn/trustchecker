const { Queue } = require('bullmq');

// Instantiate a persistent connection for raw DW logging to prevent OLTP IO blocks
const analyticsEventsQueue = new Queue('analytics-events', {
    connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

module.exports = { analyticsEventsQueue };
