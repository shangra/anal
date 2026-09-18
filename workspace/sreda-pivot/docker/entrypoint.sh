#!/bin/sh
set -e

# first arg is `-f` or `--some-option`
if [ "${1#-}" != "$1" ]; then
    set -- npm "$@"
fi

if [ "$1" = 'npm' ]; then
    LOGS_CRON_JOB="*/10    *       *       *       *       /app/sendlogs.sh"
    sed -i "s|$LOGS_CRON_JOB||g" /etc/crontabs/root
    if [ $LOOGER == 'true' ]; then
        echo "$LOGS_CRON_JOB" >>/etc/crontabs/root
    fi

    if [ -n "${DB_HOST}" ]; then
        DATABASE_URL=postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_DATABASE

        echo "Waiting for db to be ready..."
        ATTEMPTS_LEFT_TO_REACH_DATABASE=60
        until [ $ATTEMPTS_LEFT_TO_REACH_DATABASE -eq 0 ] || DATABASE_ERROR=$(psql $DATABASE_URL -XtAc "SELECT 1;" 2>&1); do
            if [ $? -eq 255 ]; then
                ATTEMPTS_LEFT_TO_REACH_DATABASE=0
                break
            fi
            sleep 1

            ATTEMPTS_LEFT_TO_REACH_DATABASE=$((ATTEMPTS_LEFT_TO_REACH_DATABASE - 1))
            echo "Still waiting for db to be ready... Or maybe the db is not reachable. $ATTEMPTS_LEFT_TO_REACH_DATABASE attempts left"
        done

        if [ $ATTEMPTS_LEFT_TO_REACH_DATABASE -eq 0 ]; then
            echo "The database is not up or not reachable:"
            echo "$DATABASE_ERROR"
            exit 1
        else
            echo "The db is now ready and reachable"
        fi

        if [ "$(psql $DATABASE_URL -XtAc "SELECT 1 FROM information_schema.schemata WHERE schema_name = '$DB_SCHEMA';")" != '1' ]; then
            echo "Schema does not exist"
            npm run db:renew
        fi

        npm run core:collect
        npm run db:up
        # npm run updatedb
    fi
fi

exec "$@"
