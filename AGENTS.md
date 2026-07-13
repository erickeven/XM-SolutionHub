# XM Design-in Platform

本仓库是依据 `docs/rebuild-2026/` 从零创建的新系统。该目录全部最终文档是业务、角色、UI、技术与验收的唯一基线；冲突时先修订最终文档，再改代码。

## 固定技术栈

- React 19 + TypeScript + Vite
- Node.js 24 LTS + TypeScript + Express 5
- Prisma 7 + MySQL 9.7、Redis 8
- SeaweedFS 4.29 安全派生版，经通用 S3 Adapter 使用
- 模块化单体 + 独立 Worker + MySQL Outbox
- Docker Compose、Vitest、Supertest、RTL、Playwright

## 硬约束

- Route → Controller/Schema → Application Service → Domain Policy → Repository/Adapter。
- MySQL 是唯一事务事实源；不得引入 PostgreSQL、pgvector 或旧 schema 假设。
- 初始化只创建管理员、RBAC 和必要配置，不灌演示业务数据。
- 文件原件、派生物和压缩包版本化；文件访问使用短时授权，不返回永久对象地址。
- 禁止 `any`、`@ts-ignore`、`eslint-disable`、前端假数据和无来源 AI 回答。
- 不复用旧项目代码、迁移、测试、页面、假数据或部署文件。

## 验证

```bash
pnpm verify
pnpm e2e
python scripts/remote_validate.py
python scripts/remote_scan_images.py
python scripts/remote_operational_verify.py
```

敏感凭据仅存于被忽略的 `.env.local`/生产 `.env`，不得打印、复制或提交。
