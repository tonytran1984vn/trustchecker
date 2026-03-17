-- SOC2 SC-2: DB-level audit trigger for mutation logging
CREATE OR REPLACE FUNCTION audit_mutation() RETURNS trigger AS $fn$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO data_mutation_log (table_name, operation, row_id, org_id, old_data, timestamp)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id::text, OLD.org_id, row_to_json(OLD)::jsonb, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO data_mutation_log (table_name, operation, row_id, org_id, old_data, new_data, timestamp)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id::text, NEW.org_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO data_mutation_log (table_name, operation, row_id, org_id, new_data, timestamp)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id::text, NEW.org_id, row_to_json(NEW)::jsonb, NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

-- Attach to 8 critical tables
DO $do$
DECLARE
    tbl text;
    tables text[] := ARRAY['users','products','fraud_alerts','ops_incidents_v2','evidence_items','compliance_records','partners','certifications'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_mutation_trigger ON %I', tbl);
        EXECUTE format('CREATE TRIGGER audit_mutation_trigger AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_mutation()', tbl);
        RAISE NOTICE 'Audit trigger on %', tbl;
    END LOOP;
END;
$do$;
