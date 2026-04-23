#!/bin/sh
set -e

if [ -n "$DB_HOST" ]; then
  echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  timeout=30
  until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USERNAME" >/dev/null 2>&1; do
    timeout=$((timeout - 2))
    if [ "$timeout" -le 0 ]; then
      echo "ERROR: PostgreSQL not reachable after 30s. Starting anyway."
      break
    fi
    sleep 2
  done
fi

php artisan migrate --force
php artisan db:seed --force

exec "$@"
