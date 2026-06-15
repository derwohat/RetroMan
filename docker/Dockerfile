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

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js app (standalone mode)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma: CLI, all @prisma/* sub-packages, schema, and generated client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma  ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma       ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma      ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated                      ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations                  ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma               ./prisma/schema.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.mjs                    ./prisma/seed.mjs

# Copy bcryptjs (needed by seed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs              ./node_modules/bcryptjs

# Uploads directory (mapped as Docker volume)
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Entrypoint: runs migrations + seed then starts the server
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/entrypoint.sh"]
