# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:22-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY patches ./patches

RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Build TypeScript
# ============================================
FROM deps AS builder

WORKDIR /app

COPY src ./src
COPY data ./data
COPY tsconfig.json ./

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

# Install production deps trước
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# Cài Playwright Chromium TRƯỚC khi copy dist
# → layer này được cache, không bị rebuild khi code thay đổi
RUN npx playwright install --with-deps chromium

# Copy built code (layer này thay đổi mỗi lần build, nhưng Playwright đã được cache ở trên)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

RUN mkdir -p /app/logs

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
