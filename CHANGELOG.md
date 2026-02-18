# Changelog

All notable changes to this project will be documented in this file.

## [9.4.2] — 2026-02-18

### Security (Backend — Audit v2)
- **SEC-01** Fixed `warnDefaultSecrets()` checking wrong fallback string; added length check (`config.js`)
- **SEC-02** Protected `/metrics` endpoint with admin auth (`index.js`)
- **SEC-03** Removed `remaining_attempts` info leak from login errors (`login.js`)
- **SEC-04** Replaced LIKE-based token search with `json_extract` to prevent SQL injection (`account.js`)
- **SEC-05** Created `safeError()` utility; applied across **18 route files** to prevent `e.message` leakage
- **SEC-06** Removed `'unsafe-inline'` from CSP `scriptSrc` and `scriptSrcAttr` (`index.js`)
- **SEC-07** Hash and store MFA backup codes with bcrypt for account recovery (`mfa.js`)
- **SEC-08** Added field allowlist for profile updates to prevent mass assignment (`account.js`)
- **SEC-10** WAF uses server-generated `req.requestId` instead of user-supplied header (`waf.js`)
- **SEC-11** Added `validate(schemas.register)` middleware to registration route (`login.js`)
- **SEC-12** Added `validate(schemas.login)` middleware to login route (`login.js`)
- **SEC-13** Added password reuse prevention on password change (`account.js`)

### Bug Fixes (Found via find-bugs)
- **Fixed** Login validation schema required `email` but handler uses `username` (`validate.js`)
- **Fixed** MFA disable not clearing `mfa_backup_codes` from database (`mfa.js`)
- **Fixed** Password reuse check ran before current password verification — timing oracle (`account.js`)
- **Fixed** Register schema included `role` field — removed to prevent confusion (`validate.js`)
- **Fixed** WAF missing auth-bypass pattern `admin'--` — added quote+comment SQLi rule (`waf.js`)

### Tests
- **Added** `tests/security-audit-v2.test.js` — 13 regression tests for all SEC fixes
- **Updated** `tests/auth-flow.test.js` — SEC-03 verification, validation format assertions
- **Updated** `tests/security.test.js` — validation middleware structured error format
- **Result** 208/208 tests pass (0 failures)

### Schema
- **Added** `mfa_backup_codes TEXT` column migration for users table (`db.js`)

### Full System Bug Scan
- **Fixed** IDOR in `/payment/confirm` — added `actor_id` ownership check (`wallet-payment.js`)
- **Fixed** IDOR in `/payment/refund` — added `actor_id` ownership check (`wallet-payment.js`)
- **Fixed** `return` → `continue` in purge loop — was aborting after first table (`system.js`)
- **Fixed** `e.message` leak in email template error response (`email.js`)
- **Fixed** 8 silent `catch {}` blocks → `console.warn/debug` (`admin.js`, `system.js`, `scheduler.js`)

### Node.js Best Practices
- **Fixed** `rateLimiter.js` missing `unref()` on setInterval — prevents Jest hanging
- **Fixed** `event-bus.js` using `Math.random()` for event IDs → `crypto.randomBytes()` 
- **Fixed** `dead-letter.js` using `Math.random()` for DLQ IDs → `crypto.randomBytes()`
- **Fixed** `db.js` `save()` using sync `writeFileSync` → async `fs.promises.writeFile`
- **Fixed** `evidence.js` sync `readFileSync`/`existsSync` → async `fs.promises` variants
- **Fixed** `scheduler.js` missing `unref()` on 30s task interval
- **Fixed** `partition-manager.js` missing `unref()` on daily scheduler
- **Fixed** `secrets-vault.js` missing `unref()` on rotation watcher
- **Fixed** `compliance-gdpr.js` silent empty `catch(e) {}` → `console.warn()`

## [9.4.1] — 2026-02-17

### Security (Backend)
- **Fixed** sync `crypto.hkdfSync()` → async `crypto.hkdf()` with LRU key cache (`encryption.js`)
- **Fixed** unsafe global key swap during `rotateKey()` (`encryption.js`)
- **Fixed** `encryptionMiddleware` → `async/await` for proper error propagation
- **Added** malformed ciphertext validation in `decrypt()`
- **Fixed** parallel preload with `Promise.allSettled()` (`secrets-vault.js`)
- **Fixed** rotation watcher unhandled rejection (`secrets-vault.js`)
- **Added** input validation for canary deployment parameters (`deployment-controller.js`)
- **Fixed** canary state field reset on promotion
- **Fixed** fire-and-forget `registerWorker()` − use `for...of` with `await` (`queue.js`)
- **Added** MAX_PENDING cap (10,000 jobs) to in-memory queue
- **Fixed** unhandled promise rejection in `InMemoryEventBus.subscribe()` (`event-bus.js`)
- **Fixed** dead-letter replay flag not persisting to Redis (`dead-letter.js`)
- **Fixed** Redis subscriber missing retry strategy and error handler (`redis.js`)
- **Fixed** `Math.random()` ZADD collision risk → counter-based member ID (`redis.js`)
- **Fixed** `cacheMiddleware` `res.json` wrapper overwrite safety (`cache.js`)

### Security (Frontend)
- **Added** `sanitize.js` with `escapeHTML()` and `sanitizeURL()` utilities
- **Fixed** XSS in `toast.js` — escape message content before `innerHTML`
- **Fixed** XSS in `notifications.js` — escape WebSocket-sourced title/message
- **Fixed** XSS in `evidence.js` — escape title/description, replace `document.write` with `textContent`
- **Fixed** XSS in `check.html` — escape all server response fields
- **Hardened** token storage: `localStorage` → `sessionStorage` (`api.js`, `auth.js`)
- **Added** JWT format validation on token load
- **Added** Content Security Policy `<meta>` tag (`index.html`)
- **Added** SRI hash for Chart.js CDN script
- **Added** same-origin URL validation for offline queue replay
- **Added** notification click URL validation in service worker (`sw.js`)
- **Added** `rel="noopener noreferrer"` on all `target="_blank"` links
- **Fixed** CSV formula injection prevention (`csv-export.js`)
