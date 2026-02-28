module.exports = {
    apps: [{
        name: 'trustchecker',
        script: 'server/index.js',
        cwd: '/opt/trustchecker',
        env: {
            NODE_ENV: 'production',
            PORT: 4000,
            DATABASE_URL: 'postgresql://trustchecker:TrustChecker2026@localhost:5432/trustchecker',
            JWT_SECRET: 'tc-jwt-secret-2026-production-key-v9',
            ENCRYPTION_KEY: 'tc-encryption-key-32chars-prod-v9!!',
            CORS_ORIGINS: 'http://localhost:4000,http://34.92.229.72,http://34.92.229.72:4000,https://tonytran.work,http://tonytran.work'
        },
        max_memory_restart: '500M',
        restart_delay: 3000,
        max_restarts: 10
    }]
};
