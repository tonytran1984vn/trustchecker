module.exports = {
  apps: [{
    name: "trustchecker-staging",
    script: "server/index.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "staging",
      PORT: 4001,
      DATABASE_URL: process.env.STAGING_DATABASE_URL || "postgresql://trustchecker:cccec19776a0a1262067a8fc7058aa18@localhost:5432/trustchecker_staging",
      JWT_SECRET: process.env.STAGING_JWT_SECRET || "staging-jwt-secret-not-for-production",
      CORS_ORIGIN: "http://localhost:3001,http://staging.tonytran.work",
      LOG_LEVEL: "debug",
      API_VERSION: "v1-staging"
    },
    max_memory_restart: "256M",
    error_file: "/var/log/trustchecker-staging-error.log",
    out_file: "/var/log/trustchecker-staging-out.log"
  }]
};
