#!/bin/sh
set -e

echo "RetroMan — running database migrations..."
cd /migrate && node node_modules/prisma/build/index.js migrate deploy --schema=schema.prisma

echo "RetroMan — seeding database..."
node /app/prisma/seed.mjs

echo "RetroMan — starting server..."
exec node /app/server.js
