# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Copy Prisma files (needed for postinstall: prisma generate)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build TypeScript
# ============================================
FROM deps AS builder

WORKDIR /app

# Copy source code and build configs
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript → dist/
RUN pnpm run build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

# Copy dependency files and install production-only deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile --prod

# Copy built code
COPY --from=builder /app/dist ./dist

# Install Playwright Chromium + system dependencies
RUN npx playwright install --with-deps chromium

# Create logs directory
RUN mkdir -p /app/logs

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
