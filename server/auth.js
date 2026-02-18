/**
 * TrustChecker Auth — Router Aggregator
 *
 * Merges all auth domain sub-routers into a single /api/auth router.
 * Individual modules:
 *   auth/core.js    — Middleware (authMiddleware, requireRole), helpers, constants
 *   auth/login.js   — POST /register, /login, /refresh
 *   auth/mfa.js     — POST /mfa/setup, /mfa/verify, /mfa/disable
 *   auth/passkey.js — Passkey register, authenticate, list, delete
 *   auth/oauth.js   — Google and GitHub OAuth callbacks
 *   auth/account.js — Password, sessions, revoke, me, profile, admin users, password reset
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, JWT_SECRET, ROLE_HIERARCHY } = require('./auth/core');

// Mount sub-routers
router.use('/', require('./auth/login'));
router.use('/', require('./auth/mfa'));
router.use('/', require('./auth/passkey'));
router.use('/', require('./auth/oauth'));
router.use('/', require('./auth/account'));

module.exports = { router, authMiddleware, requireRole, JWT_SECRET, ROLE_HIERARCHY };
