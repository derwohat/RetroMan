#!/bin/sh
set -e

echo "RetroMan — running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "RetroMan — seeding database..."
node prisma/seed.mjs

echo "RetroMan — starting server..."
exec node server.js
