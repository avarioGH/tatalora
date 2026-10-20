#!/bin/bash
# MongoDB Restore Script for ERP BOOSTUP
# Usage: ./restore-mongodb.sh <backup-directory>

set -e

if [ -z "$1" ]; then
    echo "Error: Backup directory path required."
    echo "Usage: ./restore-mongodb.sh backups/2026-09-12_10-00-00"
    exit 1
fi

TARGET_DIR="$1"
DB_URL=${DATABASE_URL:-"mongodb://db:27017/erp_db?replicaSet=rs0"}

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory $TARGET_DIR does not exist."
    exit 1
fi

echo "Starting ERP MongoDB Restore from $TARGET_DIR..."

# Execute mongorestore
# --drop will clear existing collections before restoring
if mongorestore --uri="$DB_URL" --drop "$TARGET_DIR"; then
    echo "Restore successful!"
    exit 0
else
    echo "Restore failed!"
    exit 1
fi
