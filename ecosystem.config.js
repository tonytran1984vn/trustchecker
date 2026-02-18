module.exports = {
    apps: [{
        name: 'trustchecker',
        script: 'server/index.js',
        cwd: '/var/www/TrustChecker',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production',
            PORT: 4000
        }
    }]
};
