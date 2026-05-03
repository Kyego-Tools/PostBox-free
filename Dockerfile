# ──────────────────────────────────────
#  PostBox — Docker Build
# ──────────────────────────────────────
# Just run: docker compose up -d
# First launch auto-deploys Convex functions and generates auth keys.

FROM node:20-alpine AS base

# ── 1. Install dependencies ──
FROM base AS deps
WORKDIR /app
COPY package.json ./
# Install fresh (without lockfile) so npm resolves correct platform-specific
# native binaries (lightningcss, tailwindcss oxide) for Alpine/musl.
RUN npm install

# ── 2. Build the app ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be set at build time (baked into JS bundle)
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CONVEX_SITE_URL

# Use placeholder URLs if not provided — must be valid URLs for Next.js static generation.
# These are replaced at runtime by docker-entrypoint.sh with the real values.
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL:-https://__PLACEHOLDER__.convex.cloud}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL:-https://__PLACEHOLDER__.convex.site}

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── 3. Production runner ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.convex-setup-data /app/setup-workspace && \
    chown nextjs:nodejs /app/.convex-setup-data /app/setup-workspace

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy setup dependencies (node_modules + convex functions) for first-run setup.
# These are used once to deploy Convex functions & set env vars, then cleaned up.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./setup-deps/node_modules
COPY --chown=nextjs:nodejs convex ./setup-deps/convex
COPY --chown=nextjs:nodejs package.json ./setup-deps/package.json
COPY --chown=nextjs:nodejs scripts/generate-keys.mjs ./setup-deps/generate-keys.mjs

# Entrypoints
COPY --chown=nextjs:nodejs scripts/docker/entrypoint.sh ./docker-entrypoint.sh
COPY --chown=nextjs:nodejs scripts/docker/setup.sh ./docker-setup.sh
RUN chmod +x docker-entrypoint.sh docker-setup.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
