#!/bin/bash
# Offsite Backup Script — rsync to secondary location + integrity check
# Runs daily after pg_dump at 4:30 AM

BACKUP_DIR="/var/backups"
OFFSITE_DIR="/var/backups/offsite"
LOG="/var/log/trustchecker-backup.log"
DATE=$(date +%Y%m%d)

mkdir -p $OFFSITE_DIR

echo "[$(date)] Starting backup verification" >> $LOG

# Find today's backup
BACKUP_FILE=$(ls -t $BACKUP_DIR/trustchecker-*.dump 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo "[$(date)] ERROR: No backup file found!" >> $LOG
    exit 1
fi

# Verify backup integrity
pg_restore -l "$BACKUP_FILE" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[$(date)] ERROR: Backup integrity check FAILED: $BACKUP_FILE" >> $LOG
    exit 1
fi

FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
CHECKSUM=$(md5sum "$BACKUP_FILE" | awk '{print $1}')

echo "[$(date)] OK: Backup verified: $BACKUP_FILE (${FILE_SIZE} bytes, md5: $CHECKSUM)" >> $LOG

# Copy to offsite directory (would be S3/GCS in production)
cp "$BACKUP_FILE" "$OFFSITE_DIR/trustchecker-${DATE}-verified.dump"

# Record in DB
PGPASSWORD=cccec19776a0a1262067a8fc7058aa18 psql -h localhost -U trustchecker -d trustchecker -c "
    INSERT INTO backup_offsite_log (backup_file, backup_size, offsite_location, upload_status, checksum, verified_at)
    VALUES ('$BACKUP_FILE', $FILE_SIZE, '$OFFSITE_DIR/trustchecker-${DATE}-verified.dump', 'verified', '$CHECKSUM', NOW())
" 2>/dev/null

# Keep only 14 days of offsite copies
find $OFFSITE_DIR -name "trustchecker-*.dump" -mtime +14 -delete 2>/dev/null

echo "[$(date)] Backup offsite copy complete" >> $LOG
