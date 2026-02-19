#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

if [ "$RUN_SEED" = "true" ]; then
  echo "==> Running seed..."
  node dist-seed/prisma/seed.js || echo "WARNING: Seed failed, continuing startup..."
fi

echo "==> Starting server..."
exec node dist/server.js
