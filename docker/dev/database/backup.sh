# docker/dev/database/backup.sh
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/backups/backup_${TIMESTAMP}.sql"

pg_dump -U thinkleap_user -d thinkleap > ${BACKUP_FILE}
gzip ${BACKUP_FILE}