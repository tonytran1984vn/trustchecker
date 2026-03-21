# TrustChecker Architecture

> Enterprise Digital Trust Infrastructure — v9.5.1

## System Overview

```
                    ┌─────────────┐
                    │   Nginx     │  ← TLS (Let's Encrypt) + HTTP2
                    │  :443/:80   │
                    └──────┬──────┘
                           │ reverse proxy
                    ┌──────▼──────┐
                    │   Express   │  ← Node.js (PM2 fork mode)
                    │    :4000    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │ PostgreSQL │ │ Redis │ │ WebSocket │
        │    :5432   │ │ :6379 │ │   (WS)    │
        └───────────┘ └───────┘ └───────────┘
```

## Layer Architecture

```
server/
├── boot/               ← Startup sequence
│   ├── middleware.js    ← Middleware pipeline setup
│   ├── health.js       ← Health endpoints + global error handler
│   ├── routes.js       ← Route registration
│   └── shutdown.js     ← Graceful shutdown + process error handlers
│
├── middleware/          ← 36 middleware modules
│   ├── waf.js          ← Web Application Firewall (SQLi, XSS, bot, rate limit)
│   ├── security.js     ← Helmet, CORS, sanitizer
│   ├── request-sanitizer.js ← Prototype pollution, payload limits
│   ├── org-middleware.js    ← Multi-tenant orgGuard
│   ├── api-gateway-policy.js
│   ├── api-version.js
│   └── ...
│
├── routes/             ← 82 route files (REST API)
├── engines/            ← 80 business logic engines
├── observability/      ← Metrics, tracer, SLO, Sentry, error-monitor
├── auth/               ← JWT + RBAC + OTP
├── lib/                ← Shared libraries (logger, etc.)
├── utils/              ← Shared utilities (sql-safety, etc.)
└── services/           ← Domain services (digital-twin, anomaly, etc.)
```

## Middleware Pipeline (Order Matters)

```
Request → WAF → Helmet → Sanitizer → RequestSanitizer
       → RequestLogger → Tracer → Metrics → SLO
       → Observability → API Version → API Metering
       → API Gateway → orgMiddleware → orgGuard (global)
       → Route Handler → Response
```

## Security Stack

| Layer | Component | Protection |
|-------|-----------|------------|
| L1 | Nginx + TLS | HTTPS, HTTP2, cert auto-renewal |
| L2 | WAF | SQLi, XSS, path traversal, bot blocking, rate limiting |
| L3 | Helmet | Security headers (CSP, HSTS, X-Frame-Options) |
| L4 | Request Sanitizer | Prototype pollution, payload limits, content-type |
| L5 | Auth Middleware | JWT validation, RBAC, OTP |
| L6 | orgGuard | Multi-tenant isolation (org_id scoping) |
| L7 | Route Validation | Per-endpoint permission checks |

## Key Design Decisions

1. **Monolith** — All 82 routes in single Express app. Appropriate for current scale (single VPS).
2. **Raw SQL** — 1,312 queries use parameterized raw SQL. Prisma ORM available but underutilized.
3. **Fork Mode** — PM2 fork (not cluster) due to WebSocket server sharing requirement.
4. **Global orgGuard** — Applied at boot level for ALL `/api/` routes, not per-route.
5. **Structured Logging** — JSON format with levels, timestamps, PID for log aggregation.
