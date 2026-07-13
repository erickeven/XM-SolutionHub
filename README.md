# 芯茂微数字化 Design-in 平台

基于 `docs/rebuild-2026/` 唯一基线从零创建的新系统。旧业务代码、PostgreSQL schema、迁移、演示数据和部署产物均不复用。

## 技术基线

- React 19 + TypeScript + Vite
- Node.js 24 LTS + TypeScript + Express 5
- Prisma 7 + MySQL 9.7、Redis 8、SeaweedFS 4.29 安全派生版（S3 Adapter）
- 模块化单体 + 独立 Worker + MySQL Outbox
- Docker Compose、Vitest、Supertest、RTL、Playwright

## 启动

复制 `.env.example` 为不提交的 `.env` 并替换全部占位密钥，然后执行：

```powershell
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build
```

生产部署：

```bash
docker compose --env-file .env -f compose.yaml -f compose.prod.yaml up -d --build --wait
```

初始化只创建管理员、RBAC 和必要系统配置，不创建产品、方案或资料演示数据。

## 验证

```bash
pnpm verify
pnpm e2e
python scripts/remote_validate.py
python scripts/remote_scan_images.py
python scripts/remote_operational_verify.py
```

业务、权限、架构、UI 与验收规则见 [重构资料包](docs/rebuild-2026/README.md)，正式验证结果见 [正式交付验证证据](docs/rebuild-2026/正式交付验证证据.md)。
