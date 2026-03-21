module.exports = {
    apps: [{
        name: 'trustchecker',
        script: 'server/index.js',
        cwd: '/opt/trustchecker',
        exec_mode: 'cluster',
        instances: 4,
        env: {
            NODE_ENV: 'production',
            PORT: 4000,
            DATABASE_URL: process.env.DATABASE_URL || 'postgresql://trustchecker:cccec19776a0a1262067a8fc7058aa18@localhost:5432/trustchecker',
            JWT_SECRET: process.env.JWT_SECRET || 'tc-jwt-secret-2026-production-key-v9',
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'tc-encryption-key-32chars-prod-v9!!',
            CORS_ORIGINS: 'http://localhost:4000,http://34.92.229.72,http://34.92.229.72:4000,https://tonytran.work,http://tonytran.work'
        },
        max_memory_restart: '500M',
        restart_delay: 3000,
        max_restarts: 10,
        kill_timeout: 10000,
        listen_timeout: 8000,
        merge_logs: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }]
};
