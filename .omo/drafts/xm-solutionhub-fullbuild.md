# XM-SolutionHub 全量开发计划 - 草稿

## 意图路由
- INTENT: CLEAR（用户明确要求访谈）
- SIZE: Architecture（11 个拓扑组件、6 个 Phase、48 个 todo）
- 路径: intent-clear.md

## 批准门
`status: approved` — 用户于 2026-06-23 批准

## 用户决策（已锁定）
1. AI 服务: 自部署 NewAPI, .env.example 用 `your-model-name` 占位
2. SAG 源码: 有源码可参考, 保留 MIT License
3. SMTP: 开发期跳过, dev 模式接口返回重置链接
4. 产品资料: 有真实 PDF + 参数表, seed 用真实数据放 `server/prisma/seed-data/`
5. Git: main 单分支 + Conventional Commits
6. 开发顺序: 严格 PRD Phase 1→6, 每阶段验收门通过才进下一阶段
7. 测试深度: 核心路径 TDD, E2E 覆盖客户主路径 + 后台分配

## Metis 缺口分析结果
43 条发现 (8 critical, 15 high, 14 medium, 6 low) — 全部已合并到计划 todo 中:
- 模型数 19 (非 20), 已修正
- 后端六层链路 (含 Zod), 以 tech.md 为准
- 10 模块 (含 users), 以 tech.md 为准
- 6 态 (含下架/资料缺失), 以 design.md 为准
- E2E 含后台分配 (tech.md §11)
- Phase 1 gate: 登录锁定+token撤销+CSRF+空库迁移+.env覆盖
- Phase 3 gate: 水印+派生预览件+10min过期+注册解锁流程
- Phase 4 gate: SSE事件序列+多跳≥2event+来源权限过滤+幂等reindex+首字P95<3s
- Phase 5 gate: 匿名→注册合并+event采集+导出
- Phase 6 gate: 3视口+30/100/50数据量+7项安全+12项检查清单

## 计划文件
`.omo/plans/xm-solutionhub-fullbuild.md` — 603 行, 48 todo + 4 final verification, 8 个模板标题齐全

## 下一步
等待用户选择: 立即开始执行 vs 先跑双 Momus 高精度审查