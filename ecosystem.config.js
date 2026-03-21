module.exports = {
    apps: [{
        name: 'trustchecker',
        script: 'server/index.js',
        cwd: '/opt/trustchecker',
        env: {
            NODE_ENV: 'production',
            PORT: 4000,
            DATABASE_URL: process.env.DATABASE_URL,
            JWT_SECRET: process.env.JWT_SECRET,
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
            CORS_ORIGINS: process.env.CORS_ORIGINS || 'https://tonytran.work,http://tonytran.work'
        },
        max_memory_restart: '500M',
        restart_delay: 3000,
        max_restarts: 10,
        kill_timeout: 10000,
        listen_timeout: 25000,
        merge_logs: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }]
};
