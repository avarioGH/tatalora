#!/bin/bash
# MongoDB Backup Script for ERP BOOSTUP
# Reads DATABASE_URL from environment or uses default
# Creates a timestamped dump in backups/

set -e

DB_URL=${DATABASE_URL:-"mongodb://db:27017/erp_db?replicaSet=rs0"}
BACKUP_DIR="backups/$(date +'%Y-%m-%d_%H-%M-%S')"

echo "Starting ERP MongoDB Backup..."
echo "Target: $BACKUP_DIR"

mkdir -p "$BACKUP_DIR"

# Execute mongodump
if mongodump --uri="$DB_URL" --out="$BACKUP_DIR"; then
    echo "Backup successful! Saved to $BACKUP_DIR"
    exit 0
else
    echo "Backup failed!"
    rm -rf "$BACKUP_DIR"
    exit 1
fi
