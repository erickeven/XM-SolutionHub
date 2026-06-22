# XM-SolutionHub — 芯茂微选型与资料系统

> **状态**: 设计阶段，尚无代码。本文档随实施更新。

## 项目定位

面向工程师的芯片选型与方案资料平台，含 AI 问答和线索管理。前后端分离，模块化单体后端，Docker Compose 部署。

## 技术栈（已锁定）

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + Tailwind CSS |
| 后端 | Node.js 20 + TypeScript + Express + Prisma |
| 数据库 | PostgreSQL 16 + pgvector + Redis 7 |
| 存储 | MinIO（开发可用本地） |
| 包管理 | pnpm workspaces |

不要新增依赖，现有技术栈能解决的事禁止引入新框架/库。

## 目录约定

```
client/          — React 前端
server/          — Express 后端
  prisma/        — schema + seed
  src/modules/   — 按业务拆模块 (auth|products|selection|materials|solutions|knowledge|ai-chat|leads|audit)
  每个模块: *.routes.ts / *.controller.ts / *.service.ts / *.repository.ts / *.schema.ts / *.types.ts / *.test.ts
docs/            — PRD, design, tech（已定稿）
```

## 启动命令（尚未有代码，按此实现）

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm --filter server prisma:vector
pnpm --filter server prisma:migrate && pnpm --filter server dev
pnpm --filter client dev
```

## 上线前验证顺序

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

## 架构硬约束

- **后端分层**: Route → Controller(校验) → Service(业务) → Repository(Prisma) → Adapter(外部)
- **统一响应**: `{ code: number, message: string, data: T }` — code 0=成功
- **Token**: Access 2h / Refresh 7d(轮换)，Refresh 存 HttpOnly Cookie
- **测试**: 选型算法(Vitest) + API(Supertest) + 组件(RTL) + E2E(Playwright)
- **RBAC**: 匿名→注册→内部→审核员→管理员，层级递增
- **AI 知识库**: 采用 SAG 思路，基于 chunk/event/entity、pgvector、全文检索和 SQL 多跳扩展；普通向量召回只允许作为降级策略

## 禁止事项

- `any` / `@ts-ignore` / `eslint-disable`
- 前端假数据页面不接真实接口
- AI 无来源回答
- 将 Zleap-AI/SAG 原工作台作为独立服务硬嵌入本项目
- 接口直接返回永久存储地址
- 把敏感信息写入日志

## 设计基线

- 配色: 深海军蓝 + 芯片铜金 + 工业灰
- 字体: Inter / PingFang SC / Microsoft YaHei
- 间距: 4px 栅格，容器最大 1280px
- 首屏必须有选型入口，不做纯营销落地页
- 加载 / 空 / 错误 / 无权限 四态必须完整实现

## 部署服务器（本地局域网）

| 项目 | 值 |
|---|---|
| IP | `172.16.12.85` |
| SSH 端口 | `22` |
| 系统 | Ubuntu 22.04.5 LTS |
| 环境 | 宝塔面板 / Docker / Node.js / Nginx |

敏感凭据（密码等）存于 `.env.local`（已加入 `.gitignore`，勿提交），内容包括 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PASSWORD`、`DEPLOY_PORT`。

首次部署流程（待实施）：
```bash
# 从项目根目录
rsync -avz --exclude '.git' --exclude '.env.local' --exclude 'node_modules' \
  ./ root@172.16.12.85:/opt/xinmaowei/

# SSH 登入后
ssh root@172.16.12.85
cd /opt/xinmaowei
docker compose up -d
pnpm install && pnpm --filter server prisma:migrate && pnpm build
# Nginx 反代配置见宝塔面板
```

## 依赖服务

本地开发依赖 `docker compose` 启动 PostgreSQL + Redis + MinIO，并在 PostgreSQL 中启用 pgvector。数据库迁移与 seed 数据是首个可验证步骤。
