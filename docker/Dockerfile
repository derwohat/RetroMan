# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-slim AS deps
# Debian rather than Alpine: argon2 is a native module, and on musl the wrong
# prebuilt binary gets picked and segfaults on load — the process dies with no
# JavaScript error at all. glibc sidesteps the choice entirely.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Minimal Prisma CLI for migrations ───────────────────────────────
# Only installs prisma + its transitive deps (~100 MB vs ~964 MB full node_modules)
FROM node:20-slim AS migrator
WORKDIR /migrate

# npm install is where Prisma picks which schema engine to keep, and it picks
# it by looking at the libssl version of THIS stage. Without openssl here it
# chose debian-openssl-1.1.x while the runner below has libssl 3 — so the
# engine in the image was the wrong one and every fresh container downloaded
# the right one from binaries.prisma.sh at startup. An installation without
# internet, or a CDN outage, therefore could not start at all, with an error
# naming Prisma rather than RetroMan. Measured on a network without internet.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./orig-package.json
RUN node -e "\
  const p = require('./orig-package.json'); \
  const v = (p.dependencies || {}).prisma || (p.devDependencies || {}).prisma || 'latest'; \
  require('fs').writeFileSync('package.json', JSON.stringify({ name: 'migrate', version: '1.0.0', dependencies: { prisma: v } })); \
  " && npm install && rm orig-package.json

# ─── Stage 4: Runner ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma reads the libssl version to pick its query engine; node:20-slim ships
# without openssl, so every start logged a warning that it may not work as
# expected and fell back to a guess. Migrations ran anyway, but a documented
# guess is not something to ship.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Ties the GHCR package to this repository on every successful push, so the
# link does not depend on someone having set it once by hand in the UI.
LABEL org.opencontainers.image.source=https://github.com/derwohat/RetroMan

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# argon2's compiled binary. npm builds it into build/Release during install,
# and node-gyp-build loads that in preference to anything else — but Next.js's
# standalone tracer only carries prebuilds/ across. Without this the shipped
# prebuild is used instead and segfaults the moment it is loaded: the process
# dies with exit 139, no JavaScript error, and the container restart-loops
# while the log shows a clean "Ready".
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/argon2/build ./node_modules/argon2/build

# Minimal Prisma CLI for migrations
COPY --from=migrator --chown=nextjs:nodejs /migrate/node_modules /migrate/node_modules
COPY --from=builder  --chown=nextjs:nodejs /app/prisma/migrations    /migrate/migrations
COPY --from=builder  --chown=nextjs:nodejs /app/prisma/schema.prisma /migrate/schema.prisma
COPY --chown=nextjs:nodejs docker/prisma.config.js /migrate/prisma.config.js

# Generated Prisma client + seed
# pg, bcryptjs and argon2 are in serverExternalPackages → already in
# standalone's node_modules, including argon2's compiled binary
COPY --from=builder --chown=nextjs:nodejs /app/src/generated   ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.mjs ./prisma/seed.mjs
# The seed reads its collection list from here; without it the first boot fails.
COPY --from=builder --chown=nextjs:nodejs /app/prisma/default-collections.json ./prisma/default-collections.json

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# No USER directive here, on purpose. A bind mount over /app/uploads arrives
# with the host's ownership and can be unwritable for the service, and only
# root can correct that. The entrypoint repairs the directory and then drops
# to nextjs:nodejs with setpriv (util-linux, already in the base image), which
# execs rather than forks - so the server still becomes PID 1. Running the
# image with "user: 1001:1001" also works: the entrypoint skips the repair and
# goes straight on.

EXPOSE 7007
ENV PORT=7007
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
