# Changelog

All notable changes to this project will be documented in this file.

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
