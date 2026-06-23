# 备份恢复演练记录

> 项目：XM-SolutionHub — 芯茂微选型与资料系统
> 本文档记录 PostgreSQL 和 MinIO 的备份恢复流程及演练结果。

## 前置条件

- Docker Compose 运行中（postgres + minio）
- `mc`（MinIO Client）已安装并配置：`mc alias set xm http://localhost:9000 <accessKey> <secretKey>`
- `pg_dump` / `pg_restore` 已安装（PostgreSQL 16 client）

## 备份步骤

```bash
# 1. 进入 ops 目录
cd docs/ops

# 2. 全量备份（PG + MinIO）
bash backup-full.sh ./backups

# 3. 单独备份 PostgreSQL
bash backup-pg.sh ./backups

# 4. 单独备份 MinIO
bash backup-minio.sh ./backups
```

## 恢复步骤

### PostgreSQL 恢复

```bash
cd docs/ops
bash restore-pg.sh ./backups/xm-20260101-120000.dump
```

恢复流程：
1. 脚本会要求确认（危险操作）
2. 终止所有数据库连接
3. 删除并重建数据库
4. 重新启用 vector + pg_trgm 扩展
5. 从 dump 文件恢复全部数据

### MinIO 恢复

```bash
cd docs/ops
bash restore-minio.sh ./backups/minio-20260101-120000/
```

恢复流程：
1. 脚本会要求确认（危险操作）
2. 将本地备份镜像回写到 MinIO bucket

## 验证标准

恢复完成后需验证：

- [ ] DB 连接正常：`psql -h localhost -U postgres -d xinmaowei -c "SELECT count(*) FROM products;"`
- [ ] 扩展已启用：`psql -h localhost -U postgres -d xinmaowei -c "SELECT * FROM pg_extension WHERE extname IN ('vector','pg_trgm');"`
- [ ] MinIO 文件可访问：通过 API 签名 URL 下载确认
- [ ] API 健康检查：`curl http://localhost:3001/api/v1/health`
- [ ] seed 数据验证：选型页面能正常匹配产品

## 演练记录

| 日期 | 操作人 | 备份大小 | 恢复耗时 | 结果 |
|------|--------|----------|----------|------|
|      |        |          |          |      |
