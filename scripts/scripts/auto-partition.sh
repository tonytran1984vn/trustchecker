#!/bin/bash
# Auto-create future partitions for audit_log and scan_events
# Run monthly via cron: 0 0 1 * * /opt/trustchecker/scripts/auto-partition.sh

DB_USER="trustchecker"
DB_NAME="trustchecker"
DB_PASS="cccec19776a0a1262067a8fc7058aa18"

for i in 0 1 2 3; do
  YEAR=$(date -d "+${i} month" +%Y)
  MONTH=$(date -d "+${i} month" +%m)
  NEXT_YEAR=$(date -d "+$((i+1)) month" +%Y)
  NEXT_MONTH=$(date -d "+$((i+1)) month" +%m)
  
  PART_NAME_AUDIT="audit_log_${YEAR}_${MONTH}"
  PART_NAME_SCAN="scan_events_${YEAR}_${MONTH}"
  
  RANGE_START="${YEAR}-${MONTH}-01"
  RANGE_END="${NEXT_YEAR}-${NEXT_MONTH}-01"
  
  PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -c "
    CREATE TABLE IF NOT EXISTS $PART_NAME_AUDIT PARTITION OF audit_log
      FOR VALUES FROM () TO ();
  " 2>/dev/null
  
  PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME -c "
    CREATE TABLE IF NOT EXISTS $PART_NAME_SCAN PARTITION OF scan_events
      FOR VALUES FROM () TO ();
  " 2>/dev/null
done

echo "[$(date)] Auto-partition: created partitions for next 3 months"
