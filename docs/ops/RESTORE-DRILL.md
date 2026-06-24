# 备份恢复演练

> 所有命令均在服务器项目根目录 `/opt/xinmaowei` 执行。默认不恢复到生产目标。

## 前置条件

- `docker compose -f docker-compose.prod.yml ps` 中 PostgreSQL 与 MinIO 为健康状态。
- 项目根目录存在权限为 `600` 的 `.env`。
- 首次使用 MinIO 脚本前准备 `minio/mc:latest` 镜像。

```bash
docker pull minio/mc:latest
```

若 Docker Hub 直连受限，可使用服务器现有镜像源：

```bash
docker pull docker.1ms.run/minio/mc:latest
docker tag docker.1ms.run/minio/mc:latest minio/mc:latest
```

## 创建全量备份

```bash
mkdir -p backups/drill
bash docs/ops/backup-full.sh "$PWD/backups/drill"
```

产物包括：

- `xm-*.dump`：PostgreSQL 自定义格式备份。
- `minio-*`：MinIO Bucket 文件镜像目录。

## PostgreSQL 隔离恢复

禁止首次演练直接恢复到 `xinmaowei`。使用独立数据库：

```bash
DUMP_FILE=$(find backups/drill -maxdepth 1 -name 'xm-*.dump' | sort | tail -n 1)
bash docs/ops/restore-pg.sh "$DUMP_FILE" xinmaowei_restore_drill
```

验证数据和扩展：

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d xinmaowei_restore_drill -c 'SELECT count(*) FROM "Product";'
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d xinmaowei_restore_drill \
  -c "SELECT extname FROM pg_extension WHERE extname IN ('vector','pg_trgm') ORDER BY extname;"
```

验证后删除隔离数据库：

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  dropdb --if-exists -U postgres xinmaowei_restore_drill
```

## MinIO 隔离恢复

使用独立 Bucket，禁止覆盖生产 Bucket：

```bash
MINIO_BACKUP=$(find backups/drill -maxdepth 1 -type d -name 'minio-*' | sort | tail -n 1)
bash docs/ops/restore-minio.sh "$MINIO_BACKUP" xinmaowei-restore-drill
```

使用一次性 `mc` 容器核对对象数量：

```bash
NETWORK=$(docker inspect xm-minio --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}}{{end}}')
docker run --rm --network "$NETWORK" --env-file .env --entrypoint /bin/sh minio/mc:latest -eu -c '
  mc alias set local http://minio:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null
  mc ls --recursive --json local/xinmaowei-restore-drill | wc -l
  mc rb --force local/xinmaowei-restore-drill
'
```

## 生产恢复保护

- 恢复目标等于生产数据库或生产 Bucket 时，脚本要求交互确认。
- 自动化生产恢复必须显式设置 `RESTORE_CONFIRM=YES`。
- 执行生产恢复前必须停止写入流量并再次创建最新备份。

## 演练记录

| 日期 | PostgreSQL 备份 | PostgreSQL 恢复 | MinIO 备份 | MinIO 恢复 | 结果 |
|---|---:|---:|---:|---:|---|
| 2026-06-24 | 48,921 B | 5 个产品，`vector`/`pg_trgm` 正常 | 0 个对象 | 隔离 Bucket 0/0 一致 | 通过 |

本次生产 Bucket 为空，因此 MinIO 演练验证的是空备份、隔离恢复和清理流程；生产产生首批资料后需再次执行含对象恢复演练。
