# CHANGELOG — TrustChecker System

## [Unreleased] — 2026-02-20

### 🔐 Security
- **RBAC Overhaul**: Migrated 30+ routes from `requireRole()` to granular `requirePermission()` (anomaly, billing, branding, compliance, email, evidence, notifications, products, reports, stakeholder, support, sustainability, system, wallet)
- **Email-based Login**: Changed auth from `username` to `email` as primary identifier
- **Force Password Change**: Added `must_change_password` flow with 10min JWT token for first-time login
- **requireSuperAdmin Middleware**: Created and applied to pricing, org management, KYC approver routes
- **Expanded Role Hierarchy**: 10 roles (super_admin → admin → executive → manager → ops_manager/risk_officer/compliance_officer → developer → operator → viewer)
- **Carbon Registry Hardening**: JSON persistence, input validation, double-mint dedup, optimistic locking, bounded arrays, collision-safe IDs
- **Platform Architecture Auth**: `requirePermission('admin:manage')` on all `/platform/*` endpoints
- **Audit Findings Auth**: `requirePermission('compliance:review')` on GET `/audit-findings`
- **Financial Input Validation**: Capped numeric inputs on `/exposure`, `/economic-capital`, `/revenue-projection`

### ✨ Features
- **KYC Business Submission**: Users can submit businesses for verification (`POST /businesses/submit`)
- **KYC Approver Management**: Super admin can manage designated approvers (CRUD)
- **Pricing Admin**: Super admin can update/reset plan and usage pricing dynamically
- **Carbon Engine v2.0**: Carbon grades (A+ to F), regulatory frameworks (EU CBAM, CSRD, SEC Climate, ISO 14064, Paris, VN Green Growth), 5-level maturity model
- **14 New DB Tables**: supply_routes, channel_rules, route_breaches, risk_models, model_change_requests, forensic_cases, duplicate_classifications, feature_store, model_performance, training_runs, route_simulations, code_registry, generation_limits, pricing_overrides
- **Tenant Enhancement**: Added `req.isSuperAdmin` flag for downstream convenience

### 🐛 Bug Fixes
- Fixed login to use `email` instead of `username` for user lookup
- Fixed register to make `username` optional, using email prefix as display name
- Fixed `enrichUserWithOrg` to include `feature_flags` and preserve `user_type`
- Fixed validation schema to match email-based login/register flow
- Fixed carbon registry data loss on restart (now persists to JSON file)
- Fixed unbounded in-memory arrays in institutional, ercm, carbon engines (FIFO eviction)
- Fixed credit ID collision risk (switched from Date.now to crypto.randomBytes)
- Fixed CSS @import position (moved to line 1 per spec)

### 🏗️ Infrastructure
- Added `org_id`, `submitted_by` columns to `kyc_businesses` table
- Added `user_type`, `must_change_password`, `manager_id` columns to `users` table
- Added `pricing_overrides` table for dynamic pricing
- Added safe column migration helpers in `db.js`
- Seed script creates `super_admin` role instead of `admin`
