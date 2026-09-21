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

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 7007
ENV PORT=7007
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
