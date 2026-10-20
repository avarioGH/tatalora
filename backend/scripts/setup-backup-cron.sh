#!/bin/bash
# Backup Automation setup for ERP BOOSTUP
# Installs a cronjob to execute backup-mongodb.sh hourly

set -e

SCRIPT_DIR=$(pwd)
BACKUP_SCRIPT="$SCRIPT_DIR/backup-mongodb.sh"

if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Error: backup-mongodb.sh not found in current directory."
    exit 1
fi

chmod +x "$BACKUP_SCRIPT"

# Define the cron job (runs at minute 0 of every hour)
CRON_JOB="0 * * * * cd $SCRIPT_DIR && ./backup-mongodb.sh >> $SCRIPT_DIR/../backup.log 2>&1"

# Check if the cron job already exists
(crontab -l 2>/dev/null | grep -v -F "$BACKUP_SCRIPT"; echo "$CRON_JOB") | crontab -

echo "Backup automation installed. Scheduled to run hourly."
echo "Logs will be written to backup.log"
