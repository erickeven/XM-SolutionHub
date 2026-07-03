# XM-SolutionHub — 芯茂微选型与资料系统

面向工程师的芯片选型与方案资料平台，集成 AI 问答和线索管理。前后端分离架构，后端为模块化单体（Node.js + Express + Prisma），前端为 React + Ant Design，通过 Docker Compose 一键部署 PostgreSQL + pgvector + Redis + MinIO + Nginx 全套基础设施。

## 当前状态

- 前台已完成本轮视觉重构：首页使用真实芯片评估板主视觉，选型、资料、登录/注册和后台基础布局统一为深海军蓝、芯片铜金和工业灰体系。
- 选型接口以四个核心电气参数作为精准匹配条件，应用类型和认证为可选加权项；参数不完整时前端展示热门产品并提示补充参数。
- 产品对比已从占位提示改为最多 3 个型号的参数对比弹窗。
- 密码重置链接使用 `WEB_ORIGIN` 生成，避免生产环境硬编码到本地地址。
- 本地基线已通过 lint、前后端 typecheck、前后端 Vitest 和生产构建；数据库依赖的集成测试仍需在 PostgreSQL/Redis/MinIO 启动后执行。

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
- **Node.js** 20 LTS（生产镜像使用 Node 20）
- **pnpm** 9+；如本机安装的是 pnpm 10，需要 Node.js 22.13+，或固定使用 pnpm 9

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
- `POSTGRES_PASSWORD` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — Compose 强制要求，不提供则拒绝启动
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `CSRF_SECRET` — 生成强随机值
- `STORAGE_SIGNING_SECRET` — 至少 32 位强随机值，用于文件短链签名
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

`docker-compose.prod.yml` 会先运行一次性 `migrate` 服务，迁移成功后才启动 API 和 Worker。首次部署如需演示种子数据，再执行：

```bash
docker compose -f docker-compose.prod.yml run --rm api pnpm --filter @xm-solutionhub/server prisma:seed
```

> 注意：生产环境容器使用 `postgres`、`redis`、`minio` 服务名互联，`docker-compose.prod.yml` 已覆盖这三项内部地址。不要在浏览器端暴露 MinIO 管理端口。

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

Playwright 验收需先启动真实后端依赖；`acceptance.spec.ts` 的后台完整登录流还需要设置 `E2E_ADMIN_PASSWORD`。仅启动前端 Vite 时，公开页会因 `/api` 代理不可用产生资源错误，不作为完整验收结果。

当前沙箱中全局 `pnpm` 与 Node 版本存在差异时，可直接调用本地工具等价验证：

```bash
node node_modules/eslint/bin/eslint.js . --ext .ts,.tsx
cd client && node ../node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
cd ../server && node ../node_modules/typescript/bin/tsc --noEmit
node ../node_modules/typescript/bin/tsc
```

## 服务端口

| 服务 | 开发端口 | 生产端口 |
|---|---|---|
| 前端 | 5173 | 80（Nginx） |
| 后端 API | 3000 | 3001（容器内） |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| MinIO | 9000 / 9001 | — |
