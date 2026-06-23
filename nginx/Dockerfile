# ── Stage 1: Build client ───────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# 复制 workspace 根文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

COPY client/package.json client/tsconfig.json client/vite.config.ts client/tailwind.config.ts client/postcss.config.cjs ./
COPY client/index.html ./
COPY client/src ./src

# 安装依赖并构建
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @xm-solutionhub/client build

# ── Stage 2: Nginx ──────────────────────────────────────
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/client/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]