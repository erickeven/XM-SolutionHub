# XM-SolutionHub — 芯茂微选型与资料系统

面向工程师的芯片选型与方案资料平台，集成 AI 问答和线索管理。前后端分离架构，后端为模块化单体（Node.js + Express + Prisma），前端为 React + Ant Design，通过 Docker Compose 一键部署 PostgreSQL + pgvector + Redis + MinIO + Nginx 全套基础设施。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + Tailwind CSS |
| 后端 | Node.js 20 + TypeScript + Express + Prisma |
| 数据库 | PostgreSQL 16 + pgvector + Redis 7 |
| 存储 | MinIO |
| 包管理 | pnpm workspaces |
| 部署 | Docker Compose + Nginx |

## 前置条件

- **Docker** 24+（含 Docker Compose v2）
- **Node.js** 20 LTS
- **pnpm** 9+

## 目录结构

```
.
├── client/              # React 前端
│   ├── src/
│   ├── dist/            # 构建产物
│   └── package.json
├── server/              # Express 后端
│   ├── src/
│   │   ├── modules/     # 按业务拆模块
│   │   ├── config/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── workers/
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── Dockerfile
│   └── package.json
├── nginx/               # Nginx 配置 + 多阶段构建
│   ├── Dockerfile
│   └── default.conf
├── docs/                # PRD、设计文档
├── docker-compose.yml       # 开发环境（仅 postgres/redis/minio）
├── docker-compose.prod.yml  # 生产环境（全量服务）
├── .env.example         # 环境变量模板
└── package.json         # workspace 根
```

## 快速开始（开发环境）

```bash
# 1. 安装依赖
pnpm install

# 2. 启动基础设施（PostgreSQL + Redis + MinIO）
docker compose up -d

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填写密钥和 API Key

# 4. 数据库迁移
pnpm --filter server prisma:generate
pnpm --filter server prisma:migrate:dev

# 5. 种子数据
pnpm --filter server prisma:seed

# 6. 启动后端（终端 1）
pnpm --filter server dev

# 7. 启动知识库 Worker（终端 2）
pnpm --filter server worker:knowledge

# 8. 启动前端（终端 3）
pnpm --filter client dev
```

前端访问 `http://localhost:5173`，后端 API 在 `http://localhost:3000`。

## 生产部署

### 1. 准备环境变量

```bash
cp .env.example .env
```

编辑 `.env`，**必须修改**以下项：

- `DATABASE_URL` — 指向 Docker 内部 postgres 服务
- `REDIS_URL` — 指向 Docker 内部 redis 服务
- `MINIO_ENDPOINT` — 指向 Docker 内部 minio 服务
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `CSRF_SECRET` — 生成强随机值
- `LLM_API_KEY` / `EMBEDDING_API_KEY` — 填入真实 API Key
- `SEED_ADMIN_PASSWORD` — 管理员初始密码

### 2. 构建并启动

```bash
# 构建所有镜像
docker compose -f docker-compose.prod.yml build

# 启动全部服务
docker compose -f docker-compose.prod.yml up -d
```

### 3. 初始化数据库

首次部署需执行迁移和种子：

```bash
# 进入 api 容器执行迁移
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# 执行种子数据
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

> 注意：生产环境 `DATABASE_URL` 应使用容器内地址 `postgresql://...@postgres:5432/...`，`REDIS_URL` 使用 `redis://redis:6379`，`MINIO_ENDPOINT` 使用 `http://minio:9000`。`docker-compose.prod.yml` 已通过 environment 覆盖这些值。

### 4. 验证服务

```bash
# 检查所有容器状态
docker compose -f docker-compose.prod.yml ps

# 健康检查
curl http://localhost/api/v1/health
# 期望: {"code":0,"message":"ok","data":{"status":"healthy"}}
```

## 验证命令

提交代码前执行：

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- `pnpm lint` — ESLint 检查
- `pnpm typecheck` — TypeScript 类型检查（server + client）
- `pnpm test` — Vitest 单元测试
- `pnpm build` — 构建产物（server tsc + client vite build）

## 服务端口

| 服务 | 开发端口 | 生产端口 |
|---|---|---|
| 前端 | 5173 | 80（Nginx） |
| 后端 API | 3000 | 3001（容器内） |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MinIO | 9000 / 9001 | — |