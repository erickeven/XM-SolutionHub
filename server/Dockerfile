# ── Stage 1: Build ──────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat && npm install -g pnpm@9

WORKDIR /app

# 先复制 workspace 根文件，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

COPY server/package.json server/tsconfig.json ./
COPY server/prisma ./prisma

# 安装依赖（含 devDependencies，构建需要）
RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY server/src ./src
RUN pnpm --filter @xm-solutionhub/server prisma:generate
RUN pnpm --filter @xm-solutionhub/server build

# ── Stage 2: Production runtime ─────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

# 复制生产依赖声明并安装
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD wget --spider -q http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/index.js"]