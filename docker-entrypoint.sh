#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy

echo "[entrypoint] Starting API on port ${PORT:-3333}..."
exec node dist/main
