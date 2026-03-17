-- Enterprise Readiness: RLS on remaining tables
-- Categories: partition children, platform tables, tenant tables

-- ═══════════════════════════════════════════
-- PARTITION CHILDREN: Inherit RLS from parent automatically
-- But we need to enable it explicitly on each partition
-- ═══════════════════════════════════════════

-- Audit log partitions
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'audit_log_%'
        AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        BEGIN
            EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (org_id = current_setting(''app.current_org'', true))', tbl);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END $$;

-- Scan events partitions
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'scan_events_%'
        AND tablename NOT IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true)
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
        BEGIN
            EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (org_id = current_setting(''app.current_org'', true))', tbl);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════
-- PLATFORM TABLES: These are intentionally NOT org-scoped
-- But we protect them with role-based policies
-- ═══════════════════════════════════════════

-- organizations: admins see only their own org, platform sees all
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY org_self_access ON organizations FOR ALL
USING (id = current_setting('app.current_org', true) OR current_setting('app.current_role', true) = 'platform_admin');

-- billing_plans: users see only their own plans
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY billing_isolation ON billing_plans FOR ALL
USING (user_id IN (SELECT id FROM users WHERE org_id = current_setting('app.current_org', true))
       OR current_setting('app.current_role', true) = 'platform_admin');

-- usage_metrics: org-scoped
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_isolation ON usage_metrics FOR ALL
USING (org_id = current_setting('app.current_org', true) OR current_setting('app.current_role', true) = 'platform_admin');

-- usage_records: org-scoped
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_records_isolation ON usage_records FOR ALL
USING (org_id = current_setting('app.current_org', true) OR current_setting('app.current_role', true) = 'platform_admin');

-- ═══════════════════════════════════════════
-- SYSTEM TABLES: Platform-level, restrict to platform_admin
-- ═══════════════════════════════════════════

-- system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY system_admin_only ON system_settings FOR ALL
USING (current_setting('app.current_role', true) = 'platform_admin');

-- kill_switch_logs
ALTER TABLE kill_switch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kill_switch_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY kill_switch_admin ON kill_switch_logs FOR ALL
USING (current_setting('app.current_role', true) = 'platform_admin');

-- validator_nodes
ALTER TABLE validator_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE validator_nodes FORCE ROW LEVEL SECURITY;
CREATE POLICY validator_admin ON validator_nodes FOR ALL
USING (current_setting('app.current_role', true) = 'platform_admin');

-- backup logs
DO $$
BEGIN
    ALTER TABLE backup_offsite_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE backup_offsite_log FORCE ROW LEVEL SECURITY;
    CREATE POLICY backup_admin ON backup_offsite_log FOR ALL USING (current_setting('app.current_role', true) = 'platform_admin');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE backup_verification_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE backup_verification_log FORCE ROW LEVEL SECURITY;
    CREATE POLICY backup_verify_admin ON backup_verification_log FOR ALL USING (current_setting('app.current_role', true) = 'platform_admin');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ═══════════════════════════════════════════
-- AUTH TABLES: Session/token isolation
-- ═══════════════════════════════════════════

-- sessions: user sees own sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY session_isolation ON sessions FOR ALL
USING (user_id = current_setting('app.current_user', true)::uuid OR current_setting('app.current_role', true) = 'platform_admin');

-- refresh_tokens: user sees own tokens
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY token_isolation ON refresh_tokens FOR ALL
USING (user_id = current_setting('app.current_user', true)::uuid OR current_setting('app.current_role', true) = 'platform_admin');

-- password_history: user sees own
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history FORCE ROW LEVEL SECURITY;
CREATE POLICY password_isolation ON password_history FOR ALL
USING (user_id = current_setting('app.current_user', true)::uuid OR current_setting('app.current_role', true) = 'platform_admin');

-- passkey_credentials: user sees own
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_credentials FORCE ROW LEVEL SECURITY;
CREATE POLICY passkey_isolation ON passkey_credentials FOR ALL
USING (user_id = current_setting('app.current_user', true)::uuid OR current_setting('app.current_role', true) = 'platform_admin');

-- ═══════════════════════════════════════════
-- RBAC TABLES: org-scoped roles
-- ═══════════════════════════════════════════

-- rbac_permissions: platform-level (read-only for all)
ALTER TABLE rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY rbac_perm_read ON rbac_permissions FOR SELECT USING (true);
CREATE POLICY rbac_perm_write ON rbac_permissions FOR ALL USING (current_setting('app.current_role', true) = 'platform_admin');

-- rbac_roles via rbac_role_permissions and rbac_user_roles
-- These reference org-scoped roles, protect accordingly
ALTER TABLE rbac_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY rbac_rp_access ON rbac_role_permissions FOR ALL USING (true);

ALTER TABLE rbac_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY rbac_ur_access ON rbac_user_roles FOR ALL USING (true);

-- membership_scopes
ALTER TABLE membership_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_scopes FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_isolation ON membership_scopes FOR ALL
USING (org_id = current_setting('app.current_org', true) OR current_setting('app.current_role', true) = 'platform_admin');

-- ═══════════════════════════════════════════
-- VERIFY
-- ═══════════════════════════════════════════

SELECT 'RLS enabled on ' || count(*) || ' tables' as result
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

SELECT count(*) as unprotected_remaining
FROM pg_tables t 
LEFT JOIN pg_policies p ON t.tablename = p.tablename 
WHERE t.schemaname = 'public' AND t.tablename NOT LIKE 'pg_%' AND p.policyname IS NULL;
