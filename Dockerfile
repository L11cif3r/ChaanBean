# syntax=docker/dockerfile:1

# -------------------------------------------------------------
# Base Stage
# -------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# -------------------------------------------------------------
# Dependencies Stage
# -------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
# Ensure PostgreSQL schema is used in production
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma && \
    npm ci

# -------------------------------------------------------------
# Builder Stage
# -------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Use PostgreSQL schema and generate client
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma && \
    npx prisma generate && \
    npm run build

# -------------------------------------------------------------
# Production Runner Stage
# -------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
