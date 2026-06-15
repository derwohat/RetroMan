#!/bin/sh
set -e

echo "RetroMan — running database migrations..."
node /migrate/node_modules/prisma/build/index.js migrate deploy --schema=/migrate/schema.prisma

echo "RetroMan — seeding database..."
node /app/prisma/seed.mjs

echo "RetroMan — starting server..."
exec node /app/server.js
