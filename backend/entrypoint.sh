#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

echo "==> Starting server..."
exec node dist/server.js
