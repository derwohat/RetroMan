# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Minimal Prisma CLI for migrations ───────────────────────────────
# Only installs prisma + its transitive deps (~100 MB vs ~964 MB full node_modules)
FROM node:20-alpine AS migrator
WORKDIR /migrate

COPY package.json ./orig-package.json
RUN node -e "\
  const p = require('./orig-package.json'); \
  const v = (p.dependencies || {}).prisma || (p.devDependencies || {}).prisma || 'latest'; \
  require('fs').writeFileSync('package.json', JSON.stringify({ name: 'migrate', version: '1.0.0', dependencies: { prisma: v } })); \
  " && npm install && rm orig-package.json

# ─── Stage 4: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Minimal Prisma CLI for migrations
COPY --from=migrator --chown=nextjs:nodejs /migrate/node_modules /migrate/node_modules
COPY --from=builder  --chown=nextjs:nodejs /app/prisma/migrations    /migrate/migrations
COPY --from=builder  --chown=nextjs:nodejs /app/prisma/schema.prisma /migrate/schema.prisma
COPY --chown=nextjs:nodejs docker/prisma.config.js /migrate/prisma.config.js

# Generated Prisma client + seed
# pg and bcryptjs are in serverExternalPackages → already in standalone's node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src/generated   ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.mjs ./prisma/seed.mjs

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
