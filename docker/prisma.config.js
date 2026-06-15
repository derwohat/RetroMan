// Prisma v7 config for migrate deploy — defineConfig is type-only, plain object works fine.
module.exports = { datasource: { url: process.env.DATABASE_URL } };
