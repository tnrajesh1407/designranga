# ── Stage 1: deps ─────────────────────────────────────────────────────────────
# Install production dependencies on Linux/x64 so sharp gets the correct binary.
FROM node:22-alpine AS deps
WORKDIR /app

# sharp needs these system libs for its native bindings on Alpine
RUN apk add --no-cache libc6-compat vips-dev fftw-dev build-base python3

COPY package.json package-lock.json ./
# Install ALL deps here (devDeps needed for the build stage)
RUN npm ci

# ── Stage 2: builder ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat vips-dev

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js app in standalone mode
# NEXT_TELEMETRY_DISABLED avoids network calls during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat vips-dev fftw-dev

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cloud Run injects PORT; Next.js standalone server reads it automatically
ENV PORT=8080
EXPOSE 8080

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets (CSS, JS chunks, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder (SVGs, favicon, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Copy fonts — imageProcessor.ts reads these at runtime from process.cwd()/fonts
COPY --from=builder --chown=nextjs:nodejs /app/fonts ./fonts

USER nextjs

# Next.js standalone server entry point
CMD ["node", "server.js"]
