# 验证证据目录

本目录存储 XM-SolutionHub 上线检查清单（`docs/golive-checklist.md`）各项的验证证据。

## 证据索引

| 检查项 | 证据来源 | 文件 |
|--------|----------|------|
| 1. P0 功能 | CI 全量验证 | `docs/golive-checklist.md` |
| 2. 三类角色 | security.test.ts | `server/src/__tests__/security.test.ts` |
| 3. 文件无越权 | security.test.ts | `server/src/__tests__/security.test.ts` |
| 4. AI 有来源 | coverage.test.ts | `server/src/modules/__tests__/coverage.test.ts` |
| 5. 索引可重试 | worker tests | `server/src/workers/knowledge-index.worker.test.ts` |
| 6. 后台可维护 | admin routes | `server/src/app.ts` |
| 7. 三视口 | Playwright（部署后执行） | 待补充 |
| 8. 日志/限流/审计 | audit.test.ts | `server/src/modules/audit/audit.test.ts` |
| 9. .env.example | T46 | `.env.example` |
| 10. 空库迁移 | prisma migrations | `server/prisma/migrations/` |
| 11. README | T46 | `README.md` |
| 12. 备份恢复 | T47 | `docs/ops/` |

## 验证运行命令

```bash
pnpm --filter server typecheck && pnpm --filter client typecheck && pnpm lint && pnpm --filter server test && pnpm --filter client build
```
