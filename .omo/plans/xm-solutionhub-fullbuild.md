# xm-solutionhub-fullbuild - Work Plan

## TL;DR (For humans)

**What you'll get:** 芯茂微芯片选型与方案资料平台第一版——工程师可输入电气参数获得可解释的芯片推荐, 预览规格书和 DEMO 报告前 3 页, 注册后解锁完整资料并使用有来源标注的 AI 技术问答, 内部人员可在后台管理产品/方案/资料/知识库/线索和用户权限, 全流程在 PC/平板/手机上可用。

**Why this approach:** 严格按 PRD 定义的 6 个阶段顺序交付, 每阶段通过验收门后才进入下一阶段, 确保每块功能可独立验证; SAG 知识库吸收事件/实体索引和 SQL 多跳检索思路但不嵌入原项目, 保持模块边界; AI 模型通过自部署的 NewAPI 中转统一接入, 开发期不依赖具体服务商。

**What it will NOT do:** 不做原生 App / 在线人工客服 / 支付订单库存 / 多语言 / 复杂营销 / 独立 BI 大屏; 不引入锁定技术栈以外的依赖; AI 不做无来源回答; 不嵌入 SAG 原项目工作台。

**Effort:** XL — 49 个任务, 跨 6 个阶段, 含前后端 + 知识库 Worker + 部署
**Risk:** High — SAG 多跳检索 + SSE 流式 + PDF 派生预览件为高复杂度模块
**Decisions to sanity-check:** NewAPI 代理地址和模型名上线前需确认; 开发期跳过 SMTP 改为接口返回重置链接; SAG 参考源码需保留 MIT 声明; seed 放 `server/prisma/seed-data/`

Your next move: 批准计划并选择是否在执行前运行双 Momus 高精度审查。Full execution detail follows below.

---

> TL;DR (machine): XL effort, High risk, 49 todos across 6 phases, strict phase gates, TDD on core paths, full-stack delivery from scaffold to go-live.

## Scope
### Must have
- 按 PRD §11 顺序交付 6 个 Phase 的全部功能。
- 后端 10 模块 (tech.md §2): auth / users / products / selection / solutions / materials / knowledge / ai-chat / leads / audit，每模块固定 7 文件结构 (routes/controller/service/repository/schema/types/test)。
- 19 个 Prisma 模型 + 6 枚举 (tech.md §4.1 L187-207)。
- 12 条索引要求全部在版本化 migration 中实现 (tech.md §4.2 L224-236)。
- 认证: bcrypt + jose JWT, Access 2h / Refresh 7d 轮换, HttpOnly Cookie, CSRF, 5 次失败锁定 15min, 密码重置 (dev 模式直接返回链接)。
- RBAC 5 角色: 匿名→注册→内部(STAFF)→审核员(AUDITOR)→管理员(ADMIN)，层级递增；dataScope 下推到 Repository。
- 选型引擎 5 维评分 (电气 45 / 应用 15 / 能效 15 / 合规 15 / 环境 10)，精确/近似/兜底三级匹配。
- 文件服务: StorageAdapter 抽象 (MinIO/本地), PDF 派生预览件 (前 3 页独立 storageKey), 水印下载件, 10 分钟过期签名链接, 下载审计。
- SAG 知识库: 独立 Worker 进程 + Redis Streams, chunk/event/entity 索引, 原子版本切换, 幂等重建。
- AI 问答: SSE 协议 (meta/source/delta/done/error), fast 模式默认, SQL 多跳扩展, 来源必须按权限过滤, 低置信拒答。
- 线索: 事件采集 API, 匿名→注册合并, 热度评分, 状态流转 (NEW→ASSIGNED→FOLLOWING→CONVERTED/ABANDONED), 分配审计。
- 前端全量: 首页快速选型, 选型页, 详情页, 方案资料页, AI 问答页, 登录注册, 运营后台 (产品/方案/资料/知识库/线索/用户/审计)。
- 6 态设计完成 (design.md §2 L26): 加载、空数据、错误、无权限、下架、资料缺失。
- 可观测性: Pino 请求日志 + 错误日志 + 审计日志 + 关键指标埋点 (PRD §10)。
- `.env.example` 覆盖 tech.md §9 L492-538 全部环境变量，模型名用 `your-model-name` 占位。
- `.env.local` 不提交 (已在 .gitignore)。

### Must NOT have (guardrails, anti-slop, scope boundaries)
- 禁止 `any` / `@ts-ignore` / `eslint-disable` (AGENTS.md L60, tech.md §13 item 1)。
- 禁止新增锁定技术栈外的依赖 (AGENTS.md L19, tech.md §1 L25)。
- 禁止接口直接返回永久存储地址 (tech.md §6, §13 item 2)。
- 禁止 AI 无来源回答 (PRD §7.4, tech.md §13 item 3)。
- 禁止将 Zleap-AI/SAG 原项目作为独立工作台硬嵌入 (tech.md §1 L23, §13 item 4)。
- 禁止前端只做静态假数据页面不接真实接口 (tech.md §13 item 5)。
- 禁止上传资料默认上架 (tech.md §13 item 7)。
- 禁止把 PostgreSQL ts_rank 描述为 BM25 (tech.md §13 item 9)。
- 禁止在 API 请求进程内同步执行 PDF 解析 / event/entity 抽取 / 批量向量化 (tech.md §13 item 10)。
- 禁止把敏感信息写入日志 (tech.md §13 item 8)。
- 禁止产品状态非 ACTIVE 进入外部推荐 (tech.md §5.2 rule 5)。
- 禁止 SAG 原项目 React 19 依赖冲突进入本仓库 (tech.md §1 L23)。
- 第一版不做原生 App / 在线人工客服 / 支付订单库存 / 多语言 / 复杂营销 / 独立 BI 大屏 (PRD §4.2)。
- 禁止后台管理和外部用户端共用无权限判断的接口 (tech.md §13 item 6)。

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: 核心路径 TDD (选型算法 / 文件权限 / SAG 检索 / SSE 协议 / RBAC 越权) + 其他路径 tests-after。
- 单元测试: Vitest (选型算法 / Zod schema / service 纯逻辑)。
- 集成测试: Supertest (API 权限 / 参数校验 / 错误码 / RBAC dataScope)。
- 组件测试: React Testing Library (表单 / 列表 / 解锁弹窗 / 权限状态)。
- E2E: Playwright (匿名选型 → 注册解锁 → AI 问答 → 后台分配, 3 视口 1440×900/1024×768/390×844)。
- 类型安全: `pnpm typecheck` 零错误。
- 代码风格: `pnpm lint` 零 error。
- 数据库: 空库执行 `pnpm --filter server prisma:migrate` 成功。
- 证据路径: .omo/evidence/task-<N>-xm-solutionhub-fullbuild.<ext>

## Execution strategy
### Parallel execution waves
> 严格按 PRD Phase 1→6 顺序。Phase 内部可并行，Phase 之间不可。每 Phase 全部 todo 完成且验收门通过才能进入下一 Phase。

| Wave | Phase | Todos | 可内部并行 |
| --- | --- | --- | --- |
| W1 | Phase 1: 基础框架 | T1-T10 | 脚手架/Prisma/Auth 前后端可并行 |
| W2 | Phase 2: 选型闭环 | T11-T18 | 后端 API + 前端页面可并行 |
| W3 | Phase 3: 资料闭环 | T19-T25 | 存储/预览/前端可并行 |
| W4 | Phase 4: AI 问答 | T26-T35 | Worker/检索/前端可并行 |
| W5 | Phase 5: 线索后台 | T36-T42 | 采集/聚合/后台可并行 |
| W6 | Phase 6: 上线加固 | T43-T48 | 独立验证项可并行 |

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (脚手架) | — | T2,T3 | — |
| T2 (Docker Compose) | T1 | T3 | — |
| T3 (Prisma schema) | T1,T2 | T4,T5,T6-T10 | — |
| T4 (版本化 migration) | T3 | T5 | — |
| T5 (seed) | T3,T4 | — | T6-T10 |
| T6 (auth API) | T3 | T7,T8 | T5 |
| T7 (auth 安全) | T6 | T8 | T5 |
| T8 (RBAC 中间件) | T6,T7 | T9 | T5 |
| T9 (日志/审计/限流) | T1,T8 | — | T5,T10 |
| T10 (.env.example) | T1 | — | T5-T9 |
| T11 (产品 CRUD) | T8 | T13 | T12 |
| T12 (选型算法) | T3 | T13 | T11 |
| T13 (选型/产品 API) | T11,T12 | T15 | T14 |
| T14 (首页+选型页) | T13 | T18 | T15 |
| T15 (详情页) | T13 | T18 | T14 |
| T16 (空参数行为) | T13 | — | T14,T15 |
| T17 (选型 TDD) | T12 | — | T13 |
| T18 (Phase 2 验收) | T14,T15,T16,T17 | — | — |
| T19 (存储适配器) | T1 | T20,T21 | — |
| T20 (资料 CRUD) | T8,T19 | T22,T23 | T21 |
| T21 (PDF 派生预览) | T19 | T22 | T20 |
| T22 (预览/下载 API) | T20,T21 | T24 | T23 |
| T23 (注册解锁流程) | T22 | T24 | — |
| T24 (方案资料前端) | T22,T23 | T25 | — |
| T25 (Phase 3 验收) | T24 | — | — |
| T26 (知识库 CRUD) | T8 | T27 | — |
| T27 (索引 Worker) | T26,T19 | T28 | — |
| T28 (SAG fast 检索) | T27 | T29 | — |
| T29 (SAG 标准模式+降级) | T28 | T30 | — |
| T30 (AI chat SSE) | T28,T29 | T31 | — |
| T31 (来源权限过滤) | T30 | T32 | — |
| T32 (AI 前端) | T30,T31 | T34 | T33 |
| T33 (知识库管理前端) | T26,T28 | T34 | T32 |
| T34 (trace 调试前端) | T28 | T35 | T33 |
| T35 (Phase 4 验收) | T32,T33,T34 | — | — |
| T36 (事件采集 API) | T8 | T37 | — |
| T37 (线索聚合) | T36 | T38 | — |
| T38 (线索后台 API) | T37 | T40 | T39 |
| T39 (审计查询 API) | T8 | T41 | T38 |
| T40 (线索后台前端) | T38 | T42 | T41 |
| T41 (审计前端) | T39 | T42 | T40 |
| T42 (Phase 5 验收) | T40,T41 | — | — |
| T43 (性能验证) | T18,T25,T35,T42 | — | T44-T48 |
| T44 (响应式验证) | T42 | — | T43,T45-T48 |
| T45 (安全审计) | T25,T35 | — | T43,T44,T46-T48 |
| T46 (部署配置) | T42 | — | T43-T45,T47,T48 |
| T47 (备份恢复演练) | T46 | — | T43-T45,T48 |
| T48 (上线检查清单) | T43-T47 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.

### Wave 1 — Phase 1: 基础框架 (T1-T10)

- [x] 1. 初始化 pnpm workspaces + 前后端项目脚手架 + ESLint + TypeScript + CI
  What to do: 创建 monorepo 结构 (`client/` + `server/` + `docs/` + `docker-compose.yml`); 根 `package.json` 用 pnpm workspaces; `client/` 初始化 Vite + React 18 + TypeScript (strict) + Ant Design 5 + Tailwind CSS + React Router 7 + TanStack Query + Zustand + React Hook Form + axios; `server/` 初始化 Node.js 20 + TypeScript (strict) + Express + Prisma + Zod + Pino + Vitest; 安装 tech.md §1 L25 锁定的领域依赖 (`jose`, `bcrypt`, `ioredis`, `multer`, `@aws-sdk/client-s3`, `pdfjs-dist`, `pdf-lib`, `nodemailer`, `@ant-design/icons`); 配置 ESLint (禁 `any`/`@ts-ignore`/`eslint-disable`) + Prettier (2 空格缩进, 驼峰变量, 帕斯卡类名); 配置 GitHub Actions CI (lint + typecheck + test)。
  Must NOT do: 不安装锁定列表以外的运行时依赖; 不创建 `users` 模块以外的额外模块 (Phase 1 只搭脚手架); 不写业务逻辑。
  Parallelization: Wave W1 | Blocked by: 无 | Blocks: T2, T3, T10
  References: AGENTS.md L11-18 (技术栈), L24-31 (目录约定), L43-46 (验证命令); tech.md §1 L5-25 (技术决策 + 依赖锁定), §2 L29-87 (项目结构, 含 client/server 完整目录树), §9 L492-538 (环境变量列表), §13 L594-603 (禁止事项), §12 L582-590 (开发顺序 step 1)。
  Acceptance criteria: `pnpm install` 成功; `pnpm --filter client typecheck` 退出码 0; `pnpm --filter server typecheck` 退出码 0; `pnpm lint` 退出码 0; `client/src/main.tsx` 和 `server/src/index.ts` 存在且可编译; `docker-compose.yml` 文件存在 (内容在 T2 填充)。
  QA scenarios: (happy) `pnpm install && pnpm typecheck && pnpm lint` 全部退出码 0 → Evidence `.omo/evidence/task-1-stdout.txt`; (failure) 在任意 .ts 文件中添加 `const x: any = 1` → `pnpm lint` 报错退出码非 0。
  Commit: Y | feat(scaffold): 初始化 pnpm workspaces + 前后端脚手架 + ESLint + tsc + CI

- [x] 2. Docker Compose 配置 (PostgreSQL 16 + pgvector + pg_trgm + Redis 7 + MinIO)
  What to do: 创建 `docker-compose.yml`，定义 3 个服务: `postgres` (PostgreSQL 16, 预装 pgvector 扩展镜像或 entrypoint 脚本中 `CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;`)、`redis` (Redis 7)、`minio` (MinIO, 默认 bucket `xinmaowei`); 端口映射对齐 tech.md §9 (PG 5432, Redis 6379, MinIO 9000); 数据卷持久化。
  Must NOT do: 不在 compose 里硬编码生产密码; 不启动 API/Worker 服务 (compose 只管基础设施)。
  Parallelization: Wave W1 | Blocked by: T1 | Blocks: T3
  References: AGENTS.md L34-41 (启动命令), L100-102 (依赖服务); tech.md §9 L497-517 (DB/Redis/MinIO env vars), §10 L544-550 (本地启动命令)。
  Acceptance criteria: `docker compose up -d postgres redis minio` 成功; `psql -h localhost -U postgres -d xinmaowei -c "SELECT extname FROM pg_extension"` 包含 `vector` 和 `pg_trgm`; `redis-cli ping` 返回 `PONG`; MinIO 控制台 `http://localhost:9000` 可访问; `bucket xinmaowei` 存在。
  QA scenarios: (happy) `docker compose up -d && docker compose ps` 全部 Up → Evidence `.omo/evidence/task-2-compose-ps.txt`; (failure) `docker compose down -v && docker compose up -d postgres && psql ... -c "CREATE EXTENSION vector"` → 扩展 создан成功 (证明 migration 路径能工作)。
  Commit: Y | chore(infra): Docker Compose for PostgreSQL+pgvector+pg_trgm, Redis, MinIO

- [x] 3. Prisma schema.prisma — 19 模型 + 6 枚举 + 关系定义
  What to do: 在 `server/prisma/schema.prisma` 中定义全部 19 个模型和 6 个枚举 (tech.md §4.1 L177-207); 定义关系 (tech.md §4.1 L209-219: Product N-N Solution via ProductSolution, Material 0/1-1 KnowledgeDoc, KnowledgeChunk 1-1 KnowledgeEvent, KnowledgeEvent N-N KnowledgeEntity via KnowledgeEventEntity, User 1-N RefreshToken/PasswordResetToken, Lead 1-N LeadEvent, ChatSession 1-N ChatMessage); 向量列使用 `Unsupported("vector(1536)")` (tech.md §4.1 L221); `Product.params` 使用 Json 类型; `ChatMessage.sources` / `ChatMessage.feedback` / `SearchTrace.steps` 使用 Json; `AuditLog.payload` 使用 Json。
  Must NOT do: 不写 migration SQL (T4); 不写 seed (T5); 向量列不能用 Prisma 原生类型 (必须 Unsupported); 不遗漏任何模型或枚举。
  Parallelization: Wave W1 | Blocked by: T1, T2 | Blocks: T4, T5, T6-T10
  References: tech.md §4.1 L177-221 (全部模型字段 + 枚举 + 关系 + 向量列); PRD §8 L257-277 (数据实体字段); tech.md §1 L20 (Zod 校验, 前后端共享)。
  Acceptance criteria: `npx prisma validate` (workdir=server) 退出码 0; `npx prisma format` 成功; 模型数量 = 19, 枚举数量 = 6; 所有关系的外键和级联策略已定义。
  QA scenarios: (happy) `npx prisma validate` → Evidence `.omo/evidence/task-3-prisma-validate.txt`; (failure) 删除一个关系定义 → `npx prisma validate` 报错。
  Commit: Y | feat(server/prisma): 定义 19 模型 + 6 枚举 + 关系 + 向量列

- [x] 4. 版本化 Prisma migration — 扩展 + 表 + 索引 + HNSW 向量索引
  What to do: 运行 `prisma migrate dev --name init` 生成初始 migration; 在 migration SQL 中添加: `CREATE EXTENSION IF NOT EXISTS vector;` 和 `CREATE EXTENSION IF NOT EXISTS pg_trgm;`; 按 tech.md §4.2 L224-236 的 12 条索引要求创建全部物理索引 (17 个: item 5=2 个, item 7=2 个, item 8=3 个, item 11=2 个); 创建 tsvector GIN 索引用 `to_tsvector('simple', content)`; HNSW 向量索引用 `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`。
  Must NOT do: 不用 `prisma db push`; 不额外维护未定义的 `prisma:vector` 命令 (tech.md §10 L552); 不跳过任何索引; EMBEDDING_DIMENSIONS 必须 = 1536 与 migration 一致 (tech.md §4.1 L221)。
  Parallelization: Wave W1 | Blocked by: T3 | Blocks: T5
  References: tech.md §4.2 L224-236 (12 条索引要求 → 17 个物理索引), L221 (向量列 Unsupported + HNSW + $queryRaw), §10 L552 (禁止 prisma:vector); PRD §12 L360 (迁移可在空库执行); tech.md §4.2 L230-231 (tsvector GIN, ts_rank_cd 排名, 禁止称 BM25)。
  Acceptance criteria: 空库执行 `pnpm --filter server prisma:migrate` 退出码 0 (数据库全删后重建); migration SQL 包含 2 个 CREATE EXTENSION + 17 个 CREATE INDEX 语句; `SELECT indexname FROM pg_indexes WHERE schemaname='public'` 包含全部 17 索引名; tsvector 索引用 `ts_rank_cd` 不是 `ts_rank`; HNSW 索引用 `vector_cosine_ops` 距离度量。
  QA scenarios: (happy) 关闭 Docker → `docker compose down -v` → `docker compose up -d postgres` → `pnpm --filter server prisma:migrate` 退出码 0 → Evidence `.omo/evidence/task-4-migrate.txt`; (failure) 删除 migration 文件 → `prisma migrate dev` 报 "migration directory missing" 错误。
  Commit: Y | feat(server/prisma): 版本化 migration 含 pgvector/pg_trgm + 12 索引 + HNSW

- [x] 5. Seed 脚本 — 管理员 + 5 产品 + 2 方案 + 1 PDF + 基础知识库数据
  What to do: 在 `server/prisma/seed-data/` 放入真实 PDF 文件 (用户提供的芯茂微规格书/DEMO 报告); 在 `server/prisma/seed.ts` 中: 创建 1 个 ADMIN 用户 (`admin@xinmaowei.com` / bcrypt 哈希); 创建至少 5 个 Product (真实型号, params 用 JSONB, status=ACTIVE); 创建至少 2 个 Solution; 创建 ProductSolution 关联; 创建至少 1 个 Material (type=datasheet, 上传 seed-data 里的 PDF, 生成 originalStorageKey, 配置 previewStorageKey); 创建至少 2 个 KnowledgeDoc + 10 个 KnowledgeChunk + 对应 KnowledgeEvent/KnowledgeEntity/KnowledgeEventEntity (覆盖单跳和多跳样例); 产品参数 JSONB 字段名对齐 tech.md §5.1 L243-258 的 SelectionInput。
  Must NOT do: seed 不是 admin CRUD 的替代 (仅 seed); 不上传资料默认上架为 ACTIVE 外的对外可见状态 (资料 status=DRAFT 默认, seed 里的 datasheet 可以设 ACTIVE 用于演示); Seed 密码不硬编码明文 (用环境变量 `SEED_ADMIN_PASSWORD` 或 bcrypt 哈希直接写入)。
  Parallelization: Wave W1 | Blocked by: T3, T4 | Blocks: 无 | Can parallelize with: T6-T10
  References: tech.md §10 L554-560 (种子数据要求); PRD §8 L257-277 (实体字段); tech.md §5.1 L243-258 (SelectionInput → Product.params 对齐)。
  Acceptance criteria: `pnpm --filter server prisma:seed` 退出码 0; DB 中 User 表有 1 条 ADMIN; Product 表 ≥5 条 ACTIVE; Solution 表 ≥2 条; Material 表 ≥1 条; 下一阶段需要时: KnowledgeDoc ≥2, KnowledgeChunk ≥10 (Phase 4 seed 可追加)。
  QA scenarios: (happy) `docker compose up -d postgres && pnpm --filter server prisma:migrate && pnpm --filter server prisma:seed` → `psql -c "SELECT COUNT(*) FROM \"Product\""` ≥5 → Evidence `.omo/evidence/task-5-seed-count.txt`; (failure) 重复运行 seed → 脚本应幂等 (upsert 或先清理后插入), 不报唯一约束错误。
  Commit: Y | feat(server/prisma): seed 真实产品/方案/PDF + 管理员账号 + 知识库样例数据

- [x] 6. 认证模块 — 注册 / 登录 / 刷新 / 退出 / 获取当前用户 / 密码重置 (dev 模式)
  What to do: 按 tech.md §3.1 六层链路 (Route→Middleware→Controller→Zod→Service→Repository) 创建 `server/src/modules/auth/` 7 文件; 实现全部 8 个 API: POST `/api/v1/auth/register` (邮箱+密码, bcrypt 哈希, 隐私政策勾选), POST `/api/v1/auth/login` (5 次失败锁定 15min, Access Token 2h via jose, Refresh Token 7d 轮换 HttpOnly Cookie), POST `/api/v1/auth/refresh` (校验 familyId + CSRF, 旧 token 失效, 检测重放则撤销整个 family), POST `/api/v1/auth/logout` (撤销当前 Refresh Token), GET `/api/v1/auth/me` (返回用户信息和角色), POST `/api/v1/auth/password-reset` (dev 模式直接在响应里返回重置链接, 勿发邮件), POST `/api/v1/auth/password-reset/confirm` (校验一次性 token, 1 小时过期, 使用后立即失效, 修改密码后撤销全部 Refresh Token)。
  Must NOT do: 不在日志中记录密码或 token 明文 (tech.md §13 item 8); 原始 token 不得落库 (只存 tokenHash, tech.md §4.2 item 11); Cookie 必须 HttpOnly + SameSite=Lax + 生Secure (tech.md §3.4 L168)。
  Parallelization: Wave W1 | Blocked by: T3 | Blocks: T7, T8 | Can parallelize with: T5
  References: PRD §7.6 L244-253 (认证规则全部 8 条); tech.md §3.2 L130-146 (统一响应 + 错误码段), §3.3 L149-159 (安全中间件列), §3.4 L162-168 (Token 策略); PRD §9 L295-301 (API 列表)。
  Acceptance criteria: 注册 → 201 + `{code:0}`; 登录 → 200 + 返回 Access Token + Set-Cookie (HttpOnly, SameSite=Lax); 刷新 → 200 + 新 Access Token + 新 Cookie; 退出 → 200 + 清除 Cookie; me → 200 + 用户信息含 role; 密码重置 dev 模式 → 200 + 响应体含重置链接; 密码重置确认 → 200 + 老密码失效; 连续 5 次错误密码登录 → 第 6 次返回 429/锁定错误; 修改密码后旧 Refresh Token 不可使用。
  QA scenarios: (happy) Supertest 脚本完整走通注册→登录→me→刷新→退出全流程 → Evidence `.omo/evidence/task-6-auth-happy.json`; (failure) Supertest: 用错误密码登录 6 次 → 第 6 次返回锁定错误码; Supertest: 用旧 Refresh Token 刷新 → 401 + 整个 family 被撤销 → Evidence `.omo/evidence/task-6-auth-failure.json`。
  Commit: Y | feat(server/auth): 注册/登录/刷新/退出/密码重置 + 5次锁定 + token轮换

- [x] 7. 认证安全加固 — CSRF 中间件 + Refresh Token 重放检测 + 登录锁定实现
  What to do: 实现 `middleware/csrf.ts`: 对依赖 Cookie 的写请求 (refresh, logout) 校验 Origin Header 和 CSRF Token (double-submit pattern, token 放在 Cookie + Header 中, 不相等则拒); 实现 Refresh Token 重放检测: 每次刷新时检查 `revokedAt` 是否已有值, 若已撤销的 token 被再次使用 → 撤销整个 `familyId` 下全部 token; 实现登录锁定: Redis 计数器 `login:fail:{email}` 递增, TTL 15min, 达 5 次后返回 429 + `Retry-After: 900`; 实现密码重置 token 哈希存储 (只存 tokenHash, 不存原文)。
  Must NOT do: CSRF 校验不跳过生产环境开发; 锁定计数不依赖客户端; 重放检测不依赖前端。
  Parallelization: Wave W1 | Blocked by: T6 | Blocks: T8 | Can parallelize with: T5
  References: PRD §7.6 L250 (5次锁定), L253 (修改密码/禁用/重放 → 撤销全部 Refresh Token), L252 (重置链接 1h 过期); tech.md §3.3 L158 (CSRF: Origin + CSRF Token), §3.4 L168 (Refresh 轮换 + 重放检测 → 撤销 family); tech.md §4.2 item 11 (tokenHash 唯一索引)。
  Acceptance criteria: refresh 请求缺少 CSRF Header → 403; refresh 请求 Origin 不匹配 → 403; 用已轮换的旧 Refresh Token 再次刷新 → 401 + `familyId` 下全部 token `revokedAt` 被设置; 5 次错误登录后 Redis `login:fail:{email}` 值 = 5, TTL 存在; 密码重置 token 在 DB 中只有 tokenHash 列。
  QA scenarios: (happy) Supertest: 登录 → 获取 CSRF Token → 带 CSRF 和 Cookie 刷新 → 200 → Evidence `.omo/evidence/task-7-csrf-ok.json`; (failure) Supertest: 不带 CSRF Header 刷新 → 403; Supertest: 用旧 token 刷新两次 → 第二次触发 family 撤销 → Evidence `.omo/evidence/task-7-csrf-fail.json`。
  Commit: Y | feat(server/auth): CSRF + 重放检测 + 登录锁定 + 密码重置token哈希

- [x] 8. RBAC 中间件 — roleGuard + dataScope + 统一响应封装 + 错误处理
  What to do: 实现 `middleware/roleGuard.ts`: 接受角色数组, 低于最低角色返回 2000-2999 段错误码; 实现 `middleware/dataScope.ts`: 将"仅本人"/"仅分配给自己"范围条件下推到 Service/Repository 查询参数 (不能查全量后过滤, tech.md §3.3 L157); 实现 `middleware/errorHandler.ts`: 捕获错误, 脱敏返回 `{code, message, data:null}`, 不暴露堆栈; 实现 `lib/response.ts`: `successResponse<T>(data: T)` 和 `errorResponse(code, message)` 统一封装; 实现错误码常量 (1000-1999 参数, 2000-2999 认证, 3000-3999 业务, 4000-3999 外部, 5000-5999 服务端); 实现 `middleware/requestId.ts`: 每个请求生成 UUID 写入 Pino 日志上下文; 实现 `middleware/helmet.ts` + `middleware/cors.ts` + `middleware/rateLimit.ts` (按 IP 和 userId)。
  Must NOT do: dataScope 不在前端过滤 (tech.md §3.3 L157 明确); 错误处理不泄露堆栈; CORS 不允许 `*`; 限流不无上限。
  Parallelization: Wave W1 | Blocked by: T6, T7 | Blocks: T9 | Can parallelize with: T5
  References: PRD §5 L60-83 (角色权限表); tech.md §3.1 L107-115 (请求链路), §3.2 L130-146 (统一响应 + 错误码), §3.3 L149-159 (全部 8 个安全中间件); AGENTS.md L55 (RBAC 层级递增)。
  Acceptance criteria: 匿名访问需要登录的路由 → 401 + code=2001; 注册用户访问 admin 路由 → 403 + code=2003; 内部用户访问 leads 全量接口 → 返回仅分配给自己的线索 (dataScope 下推); 错误响应不含 stack trace; 响应头含 `X-Request-Id`; CORS 只允许 `WEB_ORIGIN` 配置值; helmet 基础安全头存在。
  QA scenarios: (happy) Supertest: 创建 STAFF 用户登录 → 调用 `/api/v1/admin/leads` → 返回仅 assignedTo=自己 的线索, 不是全量 → Evidence `.omo/evidence/task-8-rbac-ok.json`; (failure) Supertest: 用 USER 调用 `/api/v1/admin/leads` → 403 code=2003; Supertest: 带不合法 email 注册 → 400 code=1001 → Evidence `.omo/evidence/task-8-rbac-fail.json`。
  Commit: Y | feat(server/middleware): roleGuard + dataScope + 统一响应 + 错误处理 + requestId + helmet + cors + rateLimit

- [x] 9. 可观测性 — Pino 请求日志 + 审计日志模块 + 限流中间件
  What to do: 安装并配置 Pino (JSON 格式, tech.md §1 L19); 实现 `middleware/logger.ts`: 每个请求记 requestId, method, url, statusCode, latencyMs, userId (有则记); 在 auth 模块的关键操作 (令牌撤销, 登录锁定, 密码修改) 后写入 `AuditLog` 表 (actorId, action, targetType, targetId, payload); 实现 `modules/audit/` 模块: POST 写入 (由其他模块调用), GET 查询接口 (`/api/v1/admin/audit`, 管理员权限, 支持筛选 actor/action/target/date); 限流中间件 (T8 中的 rateLimit 在此完善): 登录/注册 5 次/分钟, AI 问答 10 次/分钟, 事件采集 30 次/分钟, 其他接口 60 次/分钟。
  Must NOT do: 日志中不记录密码/token/PII (tech.md §13 item 8); 审计日志不依赖前端传参 (由 Service 层写入)。
  Parallelization: Wave W1 | Blocked by: T1, T8 | Blocks: 无 | Can parallelize with: T5, T10
  References: PRD §10 L327-336 (非功能需求: 可观测性); tech.md §1 L19 (Pino JSON 日志), §3.3 L150 (requestId 每请求生成 + 写日志); PRD §9 L324 (审计日志接口 `/api/v1/admin/audit`); tech.md §4.1 L207 (AuditLog 模型字段)。
  Acceptance criteria: 任意 API 请求后 `AuditLog` 表有记录 (登录操作); Pino 日志输出为 JSON 格式含 requestId; 限流: 1 分钟内 6 次登录请求 → 第 6 次返回 429; `/api/v1/admin/audit` 可按 actorId/action 筛选查询。
  QA scenarios: (happy) `curl -X POST /api/v1/auth/login 5 次/分钟内` → 正常 → 第 6 次 → 429 → Evidence `.omo/evidence/task-9-ratelimit.txt`; (failure) 检查 Pino 日志输出 → `grep -i password` 无匹配 → 证据确认无敏感信息泄露 → Evidence `.omo/evidence/task-9-no-pii.txt`。
  Commit: Y | feat(server/observability): Pino 请求日志 + 审计日志模块 + 分级限流

- [x] 10. .env.example 覆盖全部 tech.md §9 环境变量
  What to do: 创建根目录 `.env.example`, 包含 tech.md §9 L492-538 的全部 39 个环境变量; 模型名用 `your-model-name` 占位符 (`LLM_MODEL`, `EMBEDDING_MODEL`, `RERANK_MODEL`); `LLM_BASE_URL`/`EMBEDDING_BASE_URL`/`RERANK_BASE_URL` 用 `http://localhost:3000` 占位 (NewAPI 地址); 所有 secret 用 `replace_me`; 确认 `.env.local` 在 `.gitignore` 中且包含 `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_PASSWORD`/`DEPLOY_PORT` (AGENTS.md L84); 添加 `SEED_ADMIN_PASSWORD` 和 `NODE_ENV=development`。
  Must NOT do: 不在 .env.example 里写真实密钥; 环境变量名不偏离 tech.md §9 定义。
  Parallelization: Wave W1 | Blocked by: T1 | Blocks: 无 | Can parallelize with: T5-T9
  References: tech.md §9 L492-538 (全部环境变量); AGENTS.md L84 (.env.local 内容); PRD §12 L359 (.env.example 覆盖必需配置)。
  Acceptance criteria: `.env.example` 变量数 = 40 (tech.md §9 的 39 个含 NODE_ENV + 新增 `SEED_ADMIN_PASSWORD`); 模型名均为 `your-model-name`; 所有 *SECRET *KEY 值为 `replace_me`; `.gitignore` 包含 `.env.local`; `.env.local` 存在且含 DEPLOY_* 字段 (不提交)。
  QA scenarios: (happy) `grep -c '=' .env.example` → 结果 ≥40 → Evidence `.omo/evidence/task-10-env-diff.txt`; (failure) 删除一个 env 变量 → grep count < 40 → 报缺失。
  Commit: Y | chore(config): .env.example 覆盖全部 40 环境变量 + .gitignore 校验

- [x] 10.5 Phase 1 验收门 — 可注册登录, 后台可访问, 空库迁移成功
  What to do: 执行验收: (1) `pnpm typecheck` 退出码 0; (2) `pnpm --filter server test` 全过; (3) Supertest: 注册→登录→me→刷新→退出全流程通过; (4) Supertest: RBAC 越权 (USER 调 admin 接口) → 403; (5) `docker compose down -v && docker compose up -d postgres redis minio && pnpm --filter server prisma:migrate && pnpm --filter server prisma:seed` 空库成功; (6) `.env.example` 变量数 = 40。
  Must NOT do: 不跳过任何验收项; 不用已有数据的库验证迁移 (必须 down -v 清空)。
  Parallelization: Wave W1 | Blocked by: T1-T10 | Blocks: T11 (Phase 2 必须等 Phase 1 验收门通过)
  References: PRD §11 L342 (Phase 1 验收: 可注册登录, 后台可访问), §12 L359-360 (.env.example + 空库迁移)。
  Acceptance criteria: 全部 6 项通过; 证据文件存在于 `.omo/evidence/`。
  QA scenarios: 全 PASS → Evidence `.omo/evidence/task-10.5-phase1-gate.txt`; F → 阻塞 Phase 2。
  Commit: N | (验收门)

### Wave 2 — Phase 2: 选型闭环 (T11-T18)

- [x] 11. 产品管理 Admin CRUD API (`/api/v1/admin/products[/{id}]`)
  What to do: 创建 `server/src/modules/products/` 7 文件; 实现 GET (列表, 分页, 搜索 model/series, 按 status 筛选), POST (创建, Zod 校验 params JSONB 结构对齐 tech.md §5.1), PATCH (更新), DELETE (软删除 status=INACTIVE); 全部管理员权限; 操作写 AuditLog; Product.model 唯一约束 (DB + Zod 双重校验); 参数单位统一 (V/A/W/mm/°C, PRD §7.2 L162)。
  Must NOT do: 不让匿名用户访问 admin 接口; DELETE 不是物理删除而是 status=INACTIVE; 产品状态非 ACTIVE 不进入外部推荐 (tech.md §5.2 rule 5)。
  Parallelization: Wave W2 | Blocked by: T8 | Blocks: T13 | Can parallelize with: T12
  References: PRD §9 L314 (products admin 接口); tech.md §4.1 L192 (Product 模型), §4.2 item 1 (Product.model 唯一索引, item 2 params GIN), §5.2 rule 5 (非 ACTIVE 不推荐); PRD §7.2 L154-162 (详情页展示要求)。
  Acceptance criteria: `GET /api/v1/admin/products?page=1&limit=20` → 200 + 分页数据; `POST` 创建产品 → 201; `PATCH` 更新 → 200; `DELETE` → 200 + status=INACTIVE; 重复 model → 400 唯一约束错误; 匿名调用 → 403。
  QA scenarios: (happy) Supertest: ADMIN 登录后 CRUD 全流程 → Evidence `.omo/evidence/task-11-products-crud.json`; (failure) Supertest: 重复 model 创建 → 400 code=3001; Supertest: USER 调用 → 403 → Evidence `.omo/evidence/task-11-products-fail.json`。
  Commit: Y | feat(server/products): Admin CRUD API + 唯一约束 + 审计日志

- [x] 12. 选型算法 — 5 维评分 + 精确/近似/兜底三级匹配 + TDD
  What to do: 创建 `server/src/modules/selection/selection.service.ts`; 实现 SelectionInput Zod schema (tech.md §5.1 L243-258); 实现 5 维评分: 电气参数 45, 应用类型 15, 能效待机 15, 合规认证 15, 环境尺寸 10 (tech.md §5.2 L272-278); 实现精确匹配 (电气参数完全覆盖 → matchLevel=exact), 近似匹配 (部分偏离 → 差异分 → matchLevel=approximate, diffs 面向用户可读如 "输出电流低于需求 0.2A"), 兜底 (无匹配 → 相似度最高 3 型号 → matchLevel=fallback, 必须展示不匹配原因); 排序: 精确优先 → 同类按 score 降序 → 同分按资料完整度高优先; 返回 MatchResult[] 含 matchLevel/score/reasons/diffs (tech.md §5.1 L260-267); 必填参数缺失返回参数错误 (1000-1999); 热门推荐仅在参数空或少时使用, 不是匹配结果, 不显示匹配分。
  Must NOT do: 电气参数不覆盖用户需求时不可标记为精确匹配 (tech.md §5.2 rule 2); 差异说明不用内部代码, 面向用户可读 (rule 3); 不排序时不考虑非 ACTIVE 产品 (rule 5)。
  Parallelization: Wave W2 | Blocked by: T3 | Blocks: T13 | Can parallelize with: T11
  References: tech.md §5.1 L243-267 (SelectionInput + MatchResult 类型), §5.2 L272-278 (5 维评分权重 + 5 条规则); PRD §7.1 L116-152 (参数要求 + 匹配规则 + 验收标准全部 7 条), §9 L303 (selection match 接口)。
  Acceptance criteria: 输入完整标准参数 → 2 秒内返回列表; 输入 electrical 不匹配的参数 → 最大 score 精确匹配为 0, 返回 approximate 列表且 diffs 达到 PRD §7.1 L142 要求; 输入无匹配的参数 → 返回 fallback Top 3 且展示不匹配原因; 必填参数缺失 → 400 code=1001; 空/极小参数 → 不调用匹配接口 (前端逻辑在 T16)。
  QA scenarios: (happy) Vitest: 输入 `{inputVoltageMin:85, inputVoltageMax:265, outputVoltage:12, outputCurrent:2, applicationType:"适配器"}` → 返回包含 exact 匹配结果 → Evidence `.omo/evidence/task-12-selection-exact.json`; (failure) Vitest: 输入 `outputCurrent:100` → 无精确匹配, 返回 approximate/fallback 且 diffs 含 "输出电流低于需求 X A" → Evidence `.omo/evidence/task-12-selection-approx.json`。
  Commit: Y | feat(server/selection): 5维评分+精确/近似/兜底匹配+TDD测试

- [x] 13. 选型 + 产品公开 API (`/api/v1/selection/match` + `/api/v1/products` + `/api/v1/products/{id}`)
  What to do: 实现 POST `/api/v1/selection/match` (公开, Zod 校验 SelectionInput, 调用 selection.service, 返回 MatchResult[]); 实现 GET `/api/v1/products` (公开, 分页, 只返回 status=ACTIVE); 实现 GET `/api/v1/products/{id}` (公开, status=ACTIVE 或 404); 产品详情含关键参数、优势、规格书入口 (datasheetMaterialId 指向的 Material 可预览)、关联方案列表 (通过 ProductSolution 查询)。
  Must NOT do: 公开接口不返回 status=INACTIVE 的产品; 不返回原始 storageKey; 详情页不暴露 admin 字段。
  Parallelization: Wave W2 | Blocked by: T11, T12 | Blocks: T14, T15 | Can parallelize with: T16, T17
  References: PRD §9 L303-306 (公开接口列表); tech.md §5.1 L260-267 (MatchResult); PRD §7.2 L154-162 (详情页展示要求, 含从推荐进入不丢失选型上下文)。
  Acceptance criteria: `POST /api/v1/selection/match` → 200 + MatchResult[]; `GET /api/v1/products` → 200 + 分页 (不含 INACTIVE); `GET /api/v1/products/{非存在ID}` → 404; `GET /api/v1/products/{ACTIVE_ID}` → 200 + 关联方案列表。
  QA scenarios: (happy) Supertest: 提交完整参数到 match → 200 + 结果含 matchLevel/score/reasons/diffs → Evidence `.omo/evidence/task-13-api-ok.json`; (failure) Supertest: 缺少必填参数 → 400 code=1001; Supertest: 访问 INACTIVE 产品 id → 404 → Evidence `.omo/evidence/task-13-api-fail.json`。
  Commit: Y | feat(server/selection): 公开选型/产品 API + 详情含关联方案

- [x] 14. 前端 — 首页 (快速选型面板) + 选型页 (筛选+结果+卡片)
  What to do: 创建 `client/src/features/selection/`; 首页 (`/`): 左侧深色品牌区 (H1="芯茂微智能选型平台"), 右侧快速选型面板 (输入电压 min/max, 输出电压, 输出电流, 应用类型 下拉, 认证需求 可选), 面板按钮文案"开始选型", 首屏底部露出下一块内容, 下方模块 (热门应用/推荐型号/方案资料/AI入口); 选型页 (`/selection`): PC 左 320px 筛选栏 + 右结果区, 移动端顶部摘要+底部抽屉筛选; 推荐卡片含型号/系列/匹配等级/综合分/关键参数/推荐理由(≤3条)/差异点(近似+兜底)/规格书+方案资料+对比按钮; 筛选改动用 500ms 防抖; 已选条件可单独移除; 空结果展示参数建议; 对比栏最多 3 型号; 使用 TanStack Query 调用 `/api/v1/selection/match`; 使用 Ant Design ConfigProvider 统一 design.md §3 的 CSS 变量 token; Tailwind 负责布局间距; 四态完整 (加载/空/错误/无权限)。
  Must NOT do: 不做纯营销落地页 (design.md §2 L20); 不用大面积紫蓝渐变/浮球/廉价线条 (design.md §3.1 L53); 不用低密度大卡片堆叠; 卡片不靠重阴影 (design.md §3.1 L57); 不用 Tailwind 全局选择器覆盖 Antd DOM (design.md §6.6 L405)。
  Parallelization: Wave W2 | Blocked by: T13 | Blocks: T18 | Can parallelize with: T15, T16, T17
  References: design.md §5.1 L148-176 (首页结构+要求), §5.2 L178-228 (选型页结构+交互要求+卡片布局示例), §3.1 L35-57 (色彩+使用规则), §3.2 L60-77 (字体), §3.3 L84-105 (间距+容器), §3.4 L107-122 (圆角阴影), §4.1 L128-134 (PC布局), §4.2 L136-145 (移动端布局), §6.6 L402-408 (Antd+Tailwind 边界), §11 L491-500 (反模板检查); PRD §7.1 L116-152 (参数要求+匹配规则+验收)。
  Acceptance criteria: 首页有快速选型入口且可直接提交; 选型页筛选后调用 POST match API, 结果卡片含全部 7 项 (型号/系列/等级/分/参数/理由/差异); 近似/兜底结果展示差异点; 空结果有参数建议非空白; 筛选 500ms 防抖; 对比栏 ≤ 3; 移动端无横向滚动; Antd ConfigProvider 主题色匹配 design.md CSS 变量。
  QA scenarios: (happy) Playwright (`1440x900`): 访问首页 → 输入参数 → 点击"开始选型" → 跳转选型页 → 看到匹配卡片 → Evidence `.omo/evidence/task-14-home-selection.png`; (failure) Playwright (`390x844`): 检查无横向滚动; 390px 下筛选抽屉可用 → Evidence `.omo/evidence/task-14-mobile.png`。
  Commit: Y | feat(client/selection): 首页快速选型面板 + 选型页筛选+结果+卡片+对比

- [x] 15. 前端 — 产品详情页
  What to do: 创建 `client/src/features/products/`; 页面结构: 产品头部 (型号/系列/状态标签/资料完整度), 关键参数矩阵 (2-4 列, 不用长段文字), 推荐应用, 规格书入口 (显示权限状态: 可预览/登录后下载/资料整理中), 关联方案列表; 从推荐列表进入详情页时保留选型上下文 (URL search params 或 React Router state); 参数单位统一展示 V/A/W/mm/°C; 产品下架时显示不可用提示。
  Must NOT do: 不用长段文字展示参数 (design.md §5.3); 不在前端硬编码产品数据; 不绕过 API 直接拿 storageKey。
  Parallelization: Wave W2 | Blocked by: T13 | Blocks: T18 | Can parallelize with: T14, T16, T17
  References: design.md §5.3 L229-245 (详情页结构+矩阵要求); PRD §7.2 L154-162 (详情内容+验收 3 条); tech.md §8.1 L456 (`/products/:id` 路由)。
  Acceptance criteria: 详情页展示型号/系列/状态/参数矩阵/规格书入口/关联方案; 参数单位正确; TD 后从选型列表点入时 URL 包含来源参数; 下架产品访问返回"产品已下架"提示非空白页。
  QA scenarios: (happy) Playwright: 选型结果 → 点击型号 → 详情页显示参数矩阵和规格书入口 → Evidence `.omo/evidence/task-15-detail.png`; (failure) Playwright: 直接访问不存在的 product id → 显示 404 状态页非空白 → Evidence `.omo/evidence/task-15-404.png`。
  Commit: Y | feat(client/products): 详情页 + 参数矩阵 + 关联方案 + 选型上下文保留

- [x] 16. 前端 — 空参数行为 + 热门型号展示
  What to do: 用户主动清空全部参数时不调用匹配接口, 前端展示热门型号并提示补充参数; 热门型号不是匹配结果, 不显示匹配分 (matchLevel/score); 在选型页和首页快速面板均有此逻辑。
  Must NOT do: 热门型号不调用 `/api/v1/selection/match` (由前端展示, 后端可提供 `/api/v1/products?sort=popular` 或类似); 不展示热门型号的 matchLevel/score (PRD §7.1 L149 明确)。
  Parallelization: Wave W2 | Blocked by: T13 | Blocks: T18 | Can parallelize with: T14, T15, T17
  References: PRD §7.1 L149 (清空参数不调接口, 热门型号不是匹配结果, 不显示匹配分)。
  Acceptance criteria: 清空全部参数 → 不发起 match 请求 (Network 面板无 POST match) → 展示热门型号 → 热门型号卡片无 matchLevel/score 标签 → 有"补充参数获取精准推荐"提示。
  QA scenarios: (happy) Playwright: 选型页清空全部筛选 → Network 面板无 `/selection/match` 请求 → 看到热门型号 → Evidence `.omo/evidence/task-16-empty-params.png`; (failure) 如果清空后仍发起了 match 请求 → 测试失败。
  Commit: Y | feat(client/selection): 空参数展示热门型号不发请求

- [x] 17. 选型算法 TDD 补全 — 边界条件 + 性能验证
  What to do: 补充 Vitest 测试: 精确匹配 (完整覆盖), 近似匹配 (单参数偏离 + 多参数偏离), 兜底 (无匹配), 空参数 (前端不调用但后端应返回验证错误), 分数排序 (精确>近似>兜底, 同类按 score 降序, 同分按资料完整度), 必填参数缺失 (400), 性能测试 (5 种产品到 100 种产品的 match 时间 < 2s P95); 前后端双重校验测试 (前端 Zod + 后端 Zod 对同一非法输入均拒绝)。
  Must NOT do: 不删除 T12 写的初始测试; 不跳过性能验证 (PRD §3 P95 < 2s 是成功指标)。
  Parallelization: Wave W2 | Blocked by: T12 | Blocks: T18 | Can parallelize with: T13-T16
  References: PRD §7.1 L144-152 (验收标准 7 条), §3 L30 (选型响应 P95 < 2 秒); tech.md §11 L564-572 (测试策略表格)。
  Acceptance criteria: `pnpm --filter server test` 全部通过; 精确匹配测试 3 种场景全过; 近似匹配 2 种场景过; 兜底 1 种过; 排序测试验证精确>近似>兜底顺序; 100 产品集 match 耗时 < 2s。
  QA scenarios: (happy) `pnpm --filter server test -- --reporter=verbose` → 所有 selection 测试 PASS → Evidence `.omo/evidence/task-17-test-output.txt`; (failure) 修改评分权重为错误值 → 测试 FAIL。
  Commit: Y | test(server/selection): 边界条件+排序+性能P95<2s 补全测试

- [x] 18. Phase 2 验收门 — 选型接口和页面可完整走通
  What to do: 执行验收脚本: (1) `pnpm typecheck` 退出码 0; (2) `pnpm --filter server test` 全过; (3) Playwright E2E: 首页输入参数 → "开始选型" → 选型页看到精确匹配卡片 → 点击进入详情页 → 参数矩阵正确 → 规格书入口存在; (4) Playwright (`390x844`): 移动端选型无横向滚动; (5) Supertest: `/api/v1/selection/match` P95 < 2s (用 100 条 seed 产品测试)。
  Must NOT do: 不跳过任何验收项; 不用 mock 数据替代真实 API 验证。
  Parallelization: Wave W2 | Blocked by: T14, T15, T16, T17 | Blocks: 无
  References: PRD §11 L343 (Phase 2 验收: 选型接口和页面可完整走通), §3 L30 (P95 < 2 秒), §12 L349-362 (上线检查清单)。
  Acceptance criteria: 5 项验收全部通过; 证据文件存在于 `.omo/evidence/`; Playwright 截图存在。
  QA scenarios: (happy) 全部 5 项 PASS → Evidence `.omo/evidence/task-18-phase2-gate.txt`; (failure) 任一项 FAIL → 阻塞 Phase 3 直到修复。
  Commit: N | (验收门，不产生代码)

### Wave 3 — Phase 3: 资料闭环 (T19-T25)

- [x] 19. 存储适配器 — StorageAdapter 抽象 (MinIO + 本地双实现)
  What to do: 在 `server/src/lib/storage/` 创建 `StorageAdapter` 接口 (tech.md §6.1 L301-305: `createSignedUrl`, `putObject`, `removeObject`); 实现 `MinioStorageAdapter` (用 `@aws-sdk/client-s3`); 实现 `LocalStorageAdapter` (写入 `STORAGE_LOCAL_DIR` 目录); 通过 `STORAGE_DRIVER` 环境变量切换 (local/minio); signed URL 有效期可配置 (默认下载 10 分钟); `Content-Disposition` 可设 inline 或 attachment。
  Must NOT do: 业务代码不直接依赖具体 SDK (只依赖 StorageAdapter, tech.md §6.1 L291); 对象默认存入私有桶; 文件名由服务端安全生成, 不接受路径片段 (tech.md §6.2 L317)。
  Parallelization: Wave W3 | Blocked by: T1 | Blocks: T20, T21
  References: tech.md §6.1 L291-306 (StorageAdapter 接口 + SignedUrlOptions), §9 L510-516; PRD §7.3 L178 (10 分钟过期)。
  Acceptance criteria: `STORAGE_DRIVER=local` 时 `putObject` 写入本地; `=minio` 时写入 MinIO; `createSignedUrl` 返回带过期参数 URL; `removeObject` 后文件不存在。
  QA scenarios: (happy) Vitest: putObject → createSignedUrl → URL 存在 → Evidence `.omo/evidence/task-19-storage.json`; (failure) removeObject 后 createSignedUrl → 报错。
  Commit: Y | feat(server/storage): StorageAdapter 抽象 + MinIO/本地双实现 + 签名URL

- [x] 20. 方案 + 资料 Admin CRUD + 公开只读 API + multer 上传
  What to do: 创建 `server/src/modules/solutions/` 和 `server/src/modules/materials/`; 方案 Admin CRUD: `/api/v1/admin/solutions[/{id}]` GET/POST/PATCH/DELETE; 资料 Admin CRUD: `/api/v1/admin/materials[/{id}]` (POST multipart, multer 流式); **公开只读**: GET `/api/v1/solutions/{id}` (方案详情), GET `/api/v1/solutions/{id}/materials` (按权限裁剪: 匿名返回 title+摘要, 登录返回完整字段, INACTIVE 不返回, PRD §9 L306-307); 上传校验: 文件大小白名单 + 扩展名 + MIME + 文件签名字节 (tech.md §6.2 L316); Material 字段: type/title/originalStorageKey/previewStorageKey/pageCount/previewPages(=3)/status(=DRAFT); `solutionId` 可空。
  Must NOT do: 默认 DRAFT 不自动上架 (tech.md §13 item 7); 不同步 PDF 解析 (tech.md §13 item 10); 非预览 `Content-Disposition: attachment` + `nosniff` (tech.md §6.2 L317); 公开 API 不返回非 ACTIVE 资料; 公开 materials 不返回 storageKey。
  Parallelization: Wave W3 | Blocked by: T8, T19 | Blocks: T22 | Can parallelize with: T21
  References: PRD §9 L306-307 (公开 solutions/materials), L316-317 (admin 接口), §7.3 L166-170; tech.md §4.1 L194-195, §6.2 L310-318。
  Acceptance criteria: 上传 PDF → 201 + status=DRAFT; 上传 .exe → 400; 公开 GET `/solutions/{id}` → 200; 公开 GET `/solutions/{id}/materials` → 匿名仅 title+摘要, 登录完整, INACTIVE 不返回; Admin GET 列表分页; PATCH status 正常。
  QA scenarios: (happy) Supertest: ADMIN 上传 PDF → Material 存在; 匿名 GET materials → 字段裁剪正确 → Evidence `.omo/evidence/task-20-upload.json`; (failure) .exe → 400; USER→admin 403; 匿名访问 INACTIVE material → 不返回。
  Commit: Y | feat(server/materials): Admin CRUD + 公开只读 API (权限裁剪) + multer 流式上传

- [x] 21. PDF 派生预览件生成 — Worker 拆前 3 页 + pageCount
  What to do: 异步用 `pdf-lib` 拆出前 3 页存独立 PDF → `previewStorageKey`; `pdfjs-dist` 计算 `pageCount` 写入; 源/预览/水印三套 storageKey 不同 (PRD §7.3 L181); 派生失败 → status 不可变 ACTIVE。
  Must NOT do: 不同步拆页 (tech.md §13 item 10); 不向前端签发原始 PDF (PRD §7.3 L180); 前端遮罩不是安全边界 (design.md §5.4 L273)。
  Parallelization: Wave W3 | Blocked by: T19 | Blocks: T22 | Can parallelize with: T20
  References: PRD §7.3 L180-181, L189; tech.md §6.2 L314-315; design.md §5.4 L273。
  Acceptance criteria: 10 页 PDF → pageCount=10, previewStorageKey 仅 3 页; original≠preview; 损坏 PDF→status 保持 DRAFT。
  QA scenarios: (happy) 上传 10 页 PDF → 派生 3 页 → Evidence `.omo/evidence/task-21-derive.json`; (failure) 损坏 PDF → DRAFT 不变。
  Commit: Y | feat(server/materials): PDF 派生前3页预览件 + pageCount + storageKey隔离

- [x] 22. 资料预览 + 下载 API — 权限签发 + 水印 + 审计 + 10min 过期
  What to do: GET `/api/v1/materials/{id}/preview` (公开): 匿名签 previewStorageKey (3 页), 登录签 originalStorageKey (全页), `Disposition: inline`; POST `/api/v1/materials/{id}/download` (登录): `pdf-lib` 加用户标识水印 → 临时 storageKey → 10min attachment 签名链接; 写 LeadEvent(download) + AuditLog(user/file/IP/time/source)。
  Must NOT do: 不返回永久直链; 匿名不可 download; 匿名不可签 originalStorageKey; 篡改页码/Range 不可读第 4 页后 (PRD §7.3 L189)。
  Parallelization: Wave W3 | Blocked by: T20, T21 | Blocks: T24 | Can parallelize with: T23
  References: PRD §7.3 L176-190, §9 L308-309; tech.md §6.2 L310-318。
  Acceptance criteria: 匿名 preview→3页; 登录 preview→全页; 匿名 download→401; 登录 download→水印 PDF+10min链接+审计; 11min 后链接→403。
  QA scenarios: (happy) Supertest 匿名 preview+登录 download → Evidence `.omo/evidence/task-22-preview-download.json`; (failure) 匿名 download→401; 11min 后→403。
  Commit: Y | feat(server/materials): 预览/下载 API + 派生件+水印+10min过期+审计

- [x] 23. 前端 — 登录/注册页 + 解锁弹窗 + 回跳恢复
  What to do: `client/src/features/auth/`; 登录+注册页 (邮箱+密码+确认+隐私勾选+强度提示), React Hook Form + Zod 前端校验; 解锁弹窗文案 (design.md §5.6 L325); 注册/登录后回跳原页面 (PRD §7.3 L177); 移动端输入 ≥44px (design.md §6.2 L373)。
  Must NOT do: 不做大营销插图 (design.md §5.6 L315); 不用 placeholder 替代 label (design.md §6.2 L369)。
  Parallelization: Wave W3 | Blocked by: T22 | Blocks: T24
  References: design.md §5.6 L309-326; PRD §7.6 L246-249; tech.md §8.1 L459-460。
  Acceptance criteria: 注册→自动登录→回跳; 弹窗文案正确; 密码<8位→不可提交; 未勾选→禁用; 移动≥44px。
  QA scenarios: (happy) Playwright: 匿名第4页→弹窗→注册→回第4页 → Evidence `.omo/evidence/task-23-unlock.png`; (failure) 7位密码→不可提交。
  Commit: Y | feat(client/auth): 登录/注册+解锁弹窗+回跳+前端校验

- [x] 24. 前端 — 方案资料页 (PDF 预览 + 权限遮罩 + 三栏/移动)
  What to do: `client/src/features/solutions/`; PC: 左目录+权限, 中 PDF 预览, 右方案摘要+型号+下载; 移动: 顶部摘要, 中 Tabs, 底部固定操作; pdfjs-dist 预览; 页码/缩放/下载固定顶部; 匿名第4页遮罩; 登录回原页码; 加载失败有重试; 缺失显示"资料整理中"。
  Must NOT do: 遮罩非安全边界 (design.md §5.4 L273); 不暴露原始 PDF 地址; 不用空白/死链。
  Parallelization: Wave W3 | Blocked by: T22, T23 | Blocks: T25
  References: design.md §5.4 L249-274; PRD §7.3 L166-190; tech.md §8.1 L457。
  Acceptance criteria: 匿名3页后遮罩; 登录全页; 下载登录后可用; 缺失"整理中"; PC三栏; 移动单列+底部; 失败有重试。
  QA scenarios: (happy) Playwright PC: 匿名3页→遮罩 → Evidence `.omo/evidence/task-24-pc.png`; (failure) 390px 无横向滚动 → Evidence `.omo/evidence/task-24-mobile.png`。
  Commit: Y | feat(client/solutions): 方案资料页 PDF预览+遮罩+三栏+移动+四态

- [x] 25. Phase 3 验收门 — 匿名和登录权限符合规则
  What to do: 7 项验收: (1) typecheck; (2) test; (3) Supertest 越权: 篡改页码/Range→无法读第4页后; (4) 10min后链接失效; (5) 水印含用户标识; (6) Playwright E2E: 匿名选型→详情→预览3页→弹窗→注册→回第4页→下载; (7) 移动端无横向滚动。
  Parallelization: Wave W3 | Blocked by: T24 | Blocks: 无
  References: PRD §11 L344, §7.3 L185-190, §12 L351。
  Acceptance criteria: 全部 7 项通过。
  QA scenarios: 全 PASS → Evidence `.omo/evidence/task-25-phase3-gate.txt`。
  Commit: N | (验收门)

### Wave 4 — Phase 4: AI 问答 (T26-T35)

- [x] 26. 知识库 Admin CRUD API + 索引任务管理
  What to do: `server/src/modules/knowledge/`; KnowledgeDoc CRUD (`/api/v1/admin/knowledge/{id}/reindex` POST 幂等, `/api/v1/admin/knowledge/{id}/trace` GET 查看状态+trace); 创建索引任务时 `docId + indexVersion` 唯一约束 (tech.md §4.2 item 12), 已存在则返回当前任务状态不重复创建 (PRD §7.4 L216, design.md §5.7 L352); 文档状态 UPLOADED→PROCESSING→READY, 失败 FAILED+可读错误 (PRD §7.4 rule 9); 重建索引生成新版本, 成功后原子切换, 半成品不参与检索。
  Must NOT do: 不让处理中/失败版本参与检索; 幂等: 同 doc+version 不重复创建任务; 重试与重建防重复点击 (design.md §5.7 L352)。
  Parallelization: Wave W4 | Blocked by: T8 | Blocks: T27
  References: PRD §7.4 L195-216, §9 L317-318; tech.md §4.1 L196-198, §4.2 item 10/12, §7.1 L323-338。
  Acceptance criteria: POST reindex → 创建 KnowledgeIndexJob (PENDING); 重复 POST reindex (相同 doc+version) → 返回已存在任务状态; GET trace → 返回状态+最近检索 trace; 文档状态流转正确。
  QA scenarios: (happy) Supertest: reindex → PENDING; 重复 → 200 + 已有任务 → Evidence `.omo/evidence/task-26-reindex.json`; (failure) 不存在的 docId → 404。
  Commit: Y | feat(server/knowledge): CRUD + 幂等reindex + trace查询 + 状态流转

- [x] 27. 知识库索引 Worker — Redis Streams + 文本提取 + 分块 + event/entity + embedding + 原子切换
  What to do: `server/src/workers/knowledge-index.worker.ts`; Redis Streams consumer group 消费索引任务 (tech.md §7.1 L338); 流程: 文本提取 (pdfjs-dist) → 清洗 → 分块 (500-800中文字符, overlap 80-120, tech.md §7.1 L346) → 每 chunk 提取 1 event (summary+eventType) → 每 chunk 提取多 entities (name+normalizedName+entityType) → chunk/event/entity 向量化 (调用 EMBEDDING_API, 1536维) → 事务写入 PG+pgvector → 建 event↔entity 关联 → 完整性检查 → 原子切换 KnowledgeDoc.indexVersion 并标 READY; 幂等: `docId + indexVersion + contentHash` 唯一 (tech.md §4.2 item 10); 有限重试 (INDEX_JOB_MAX_RETRIES=3); 失败原因落库; 超时恢复。
  Must NOT do: 不在 API 进程内同步执行 (tech.md §13 item 10); LLM 不可用时不生成自由文本 (tech.md §7.2 L381); 不把半成品参与检索 (PRD §7.4 rule 9)。
  Parallelization: Wave W4 | Blocked by: T26, T19 | Blocks: T28
  References: tech.md §7.1 L323-349 (索引流程+分块默认值+幂等+重试+原子切换); PRD §7.4 L205-216 (状态统一+原子切换+幂等重复提交)。
  Acceptance criteria: 上传 PDF → 创建任务 → Worker 消费 → KnowledgeChunk/Event/Entity 落库 → KnowledgeDoc status=READY; 重复提交同 doc+version → 0 新 chunk (幂等); 失败 → FAILED + errorMessage; 3 次重试后 → FAILED。
  QA scenarios: (happy) reindex → 等 Worker → DB 查 KnowledgeChunk ≥10, Event/Entity 存在 → Evidence `.omo/evidence/task-27-worker.json`; (failure) 模拟 embedding API 不可用 → → 该 chunk 不参与高置信 → FAILED 或降级。
  Commit: Y | feat(server/knowledge-worker): Redis Streams索引+分块+event/entity+embedding+原子切换

- [x] 28. SAG fast 模式检索 — entity/fulltext/vector + SQL多跳扩展 + rerank
  What to do: `server/src/modules/knowledge/knowledge.search.ts`; 实现 KnowledgeSearchAdapter (tech.md §7.3 L413-424); fast 模式 (默认, PRD §7.4 rule 6): entity 精确/前缀/pg_trgm 检索 → chunk 全文排名 (ts_rank_cd, 不是 BM25) → chunk/event 向量召回 (pgvector HNSW, cosine) → SQL join 扩展共享 entity 的 event (最大 2 跳, tech.md §7.1 L348) → 合并去重 → rerank (调用 RERANK_API) → 选最终 5 条证据 (topK=30 候选); 返回 ChatSource[] (docId/eventId/title/page/snippet/entities/score) + SearchTrace[] (stage/durationMs/candidateCount/selectedIds); 每次检索先按资料状态+调用者权限构造候选集 (tech.md §7.2 L382)。
  Must NOT do: 不在 recall 后仅在前端隐藏无权限来源 (tech.md §7.2 L382); 不用 ts_rank 描述为 BM25 (tech.md §13 item 9); 向量 TopK 仅作兜底不作默认 (PRD §7.4 rule 8)。
  Parallelization: Wave W4 | Blocked by: T27 | Blocks: T29, T30
  References: tech.md §7.2 L352-382 (fast+standard模式+降级5条), §7.3 L386-432 (ChatSource/SearchTraceStep/Adapter接口+回答约束); PRD §7.4 L196-216 (全部 10 条业务规则)。
  Acceptance criteria: fast 模式返回 sources 含 docId/title/page/snippet; trace 含 entity/fulltext/vector/expand/rerank 步骤; 候选数 ≤30, 最终 ≤5; 非可见资料 (status≠READY 或 权限不足) 不出现在 sources。
  QA scenarios: (happy) Vitest: seed 知识库 + 查询 "LP3798 的待机功耗是多少" → 返回 ≥1 source + trace → Evidence `.omo/evidence/task-28-fast-search.json`; (failure) 查询无相关知识 → sources=[] 且 trace 仍记录步骤。
  Commit: Y | feat(server/knowledge): SAG fast 模式检索+SQL多跳+rerank+权限过滤

- [x] 29. SAG standard 模式 + 降级策略
  What to do: standard 模式 (KNOWLEDGE_SEARCH_MODE=standard, tech.md §7.2 L366): LLM 抽取 query entities → 多路召回 → SQL 多跳 → LLM/rerank 精排 → 生成; 降级 (tech.md §7.2 L376-381): pgvector 不可用→全文+SQL扩展; event/entity 抽取失败→低置信候选; 向量 TopK 兜底; LLM 不可用→返回结构化来源列表+"生成服务暂不可用", 不伪装检索片段为完整回答。
  Must NOT do: LLM 不可用时不输出自由编造文本 (tech.md §7.2 L381); 检索片段不伪装为完整回答。
  Parallelization: Wave W4 | Blocked by: T28 | Blocks: T30
  References: tech.md §7.2 L366-381 (standard模式+5条降级)。
  Acceptance criteria: standard 模式: LLM 抽取 entity → 多路召回 → 精排 → 生成; 降级: pgvector-off → 全文+SQL 返回候选; LLM-off → 结构化来源列表 + 提示语。
  QA scenarios: (happy) Vitest: standard 模式查询 → trace 含 entity抽取步骤 → Evidence `.omo/evidence/task-29-standard.json`; (failure) 模拟 LLM 不可用 → 返回来源列表 + "生成服务暂不可用"。
  Commit: Y | feat(server/knowledge): standard 模式 + 5 条降级策略

- [ ] 30. AI 问答模块 — SSE chat + 会话/消息/反馈 API + 落库
  What to do: `server/src/modules/ai-chat/`; POST `/api/v1/ai/chat` (登录, SSE): 调用 KnowledgeSearchAdapter.search → 低置信 → 拒答 → 不调 LLM; 有来源 → LlmAdapter.generateAnswer → SSE; 事件: meta→source→delta→done/error (tech.md §7.4 L436-444); 完整回答+来源落库; 断开→INTERRUPTED; 网关关闭缓冲+心跳 (SSE_HEARTBEAT_MS=15000)。**补充 API**: GET `/api/v1/ai/sessions` (登录, 当前用户会话列表), GET `/api/v1/ai/sessions/{id}/messages` (登录, 当前用户会话消息含来源, PRD §9 L312), POST `/api/v1/ai/messages/{id}/feedback` (登录, 标记 helpful/unhelpful, PRD §9 L313); 会话和消息查询仅返回当前用户自己的 (非管理员, PRD §7.4 L213 "历史对话仅用户本人和管理员可查看"); 管理员可查看所有用户的会话。
  Must NOT do: 低置信不调 LLM; 无来源不输出自由文本; 断开不标记为完整; 会话查询不可泄露他人数据; feedback 需校验 message 属于调用者。
  Parallelization: Wave W4 | Blocked by: T28, T29 | Blocks: T31, T32
  References: tech.md §7.4 L436-446 (SSE协议); PRD §7.4 L196-216, §9 L310-313 (AI 全部 5 接口); PRD §3 L32 (首字 P95<3s); PRD §7.4 验收 L213 (历史对话权限)。
  Acceptance criteria: SSE: meta→source→delta→done; 低置信→无 delta; 断开→INTERRUPTED; GET sessions→当前用户列表; GET messages→含来源; POST feedback→更新 feedback 字段; USER A 不可见 USER B 会话; ADMIN 可见全部。
  QA scenarios: (happy) Supertest: 登录+POST chat+SSE捕获→验证事件; GET sessions→自己的; POST feedback→200 → Evidence `.omo/evidence/task-30-sse.json`; (failure) 无知识→拒答; USER A→GET B's session→403 → Evidence `.omo/evidence/task-30-reject.json`。
  Commit: Y | feat(server/ai-chat): SSE chat+sessions/messages/feedback API+权限隔离+落库

- [ ] 31. AI 来源权限过滤 — 外部用户不可读内部/已下架内容
  What to do: 在 KnowledgeSearchAdapter.search 中, 每次检索先按资料状态 (status=READY) 和调用者角色 (USER 看不到内部资料) 构造候选集 (tech.md §7.2 L382); 外部用户 AI 来源不含内部或已下架内容 (PRD §7.4 rule 10); 内部用户/管理员可见更多; 来源链接只能跳转到用户有权访问的资料。
  Must NOT do: 不在 recall 后仅在前端隐藏 (tech.md §7.2 L382 明确禁止); 来源无权限时不渲染标题与片段 (design.md §5.5 L299)。
  Parallelization: Wave W4 | Blocked by: T30 | Blocks: T32
  References: PRD §7.4 rule 10 L207; tech.md §7.2 L382 (先按权限构造候选集); design.md §5.5 L299 (来源无权限不渲染)。
  Acceptance criteria: USER 查询 → sources 中无 status≠READY 的 doc; USER 查询 → sources 中无 internal-only 标记的 doc; ADMIN 查询 → sources 包含全部。
  QA scenarios: (happy) Supertest: USER 查询 → sources 全部 READY 且无 internal → Evidence `.omo/evidence/task-31-source-filter.json`; (failure) seed 一个 internal doc → USER 查询 → sources 不含该 doc。
  Commit: Y | feat(server/ai-chat): 来源按权限+状态过滤, 外部用户不可见内部内容

- [ ] 32. 前端 — AI 问答页 (SSE 流 + 来源卡片 + 反馈 + 多跳展示)
  What to do: `client/src/features/ai-chat/`; 布局: 左会话历史+推荐问题, 中对话流, 右来源/证据关系, 底输入框 (Enter 发送, Shift+Enter 换行, 空输入禁用); AI 消息左侧, 用户右侧; AI 消息底部来源卡片 (docName/page/snippet); 多跳以"相关型号/参数→关联事项→来源片段"展示 (不暴露 event/entity/向量分, design.md §5.5 L295); 低置信用中性提示不用红色 (design.md §5.5 L297); 逐字输出 + 来源准备状态; 发送失败保留原问题+重试; SSE 独立客户端不走 Axios 解包 (tech.md §8.2 item 5)。
  Must NOT do: 不暴露内部字段 (event/entity/向量分) 给普通用户 (design.md §5.5 L295); 不自动重复提交 (tech.md §8.2 item 6); 断线仅手动重试 (tech.md §8.2 item 5)。
  Parallelization: Wave W4 | Blocked by: T30, T31 | Blocks: T35 | Can parallelize with: T33, T34
  References: design.md §5.5 L278-307 (AI问答页完整设计); tech.md §8.2 L474-477 (SSE客户端规则); PRD §7.4 L196-216。
  Acceptance criteria: SSE 正确渲染逐字输出; 来源卡片显示 docName/page/snippet; 低置信中性提示; Enter 发送; Shift+Enter 换行; 空输入禁用; 断线手动重试; 多跳展示不暴露内部字段。
  QA scenarios: (happy) Playwright: 登录 → 输入问题 → 逐字显示 → 来源卡片 → Evidence `.omo/evidence/task-32-ai-chat.png`; (failure) 无匹配 → 中性提示非红色 → Evidence `.omo/evidence/task-32-low-confidence.png`。
  Commit: Y | feat(client/ai-chat): AI问答页 SSE流+来源卡片+反馈+多跳+输入控制

- [x] 33. 前端 — 知识库管理页 (状态/版本/重建/防重复)
  What to do: `client/src/features/admin/knowledge/`; 展示 KnowledgeDoc 列表: 状态(UPLOADED/PROCESSING/READY/FAILED, design.md §5.7 L352), 索引版本, 更新时间, 失败原因; 重建索引按钮: 幂等, 已存在任务→展示任务状态不重复创建; 防重复点击; 重建期间保留当前可用版本。
  Must NOT do: 不允许重复创建同版本任务; 重建期间不暴露半成品。
  Parallelization: Wave W4 | Blocked by: T26, T28 | Blocks: T35 | Can parallelize with: T32, T34
  References: design.md §5.7 L327-352 (后台布局+知识库管理要求); PRD §7.4 rule 9 (原子切换+无半成品)。
  Acceptance criteria: 列表显示 4 种状态标签; FAILED 显示 errorMessage; 重建按钮→创建任务→状态实时更新; 重复点击→显示已有任务; PROCESSING 时不可再创建。
  QA scenarios: (happy) Playwright: ADMIN → 知识库 → 上传 → 状态从 UPLOADED→PROCESSING→READY → Evidence `.omo/evidence/task-33-knowledge-admin.png`; (failure) 对 READY doc 重复点重建 → 显示已有任务不创建。
  Commit: Y | feat(client/admin/knowledge): 状态/版本/重建/防重复/失败原因

- [x] 34. 前端 — 检索 trace 调试视图 (管理员)
  What to do: ADMIN 可展开 AI 回答的检索 trace: 展示召回模式 (fast/standard), 各步骤耗时, 命中 event/entity, 候选数, 重排结果; 可查看 chunk/event/entity 内容和 embedding 状态; 来源卡片可跳转对应资料。
  Must NOT do: 非管理员不可见 trace; 不暴露给外部用户。
  Parallelization: Wave W4 | Blocked by: T28 | Blocks: T35 | Can parallelize with: T32, T33
  References: PRD §7.4 rule 5 L201 (管理员查看 trace); tech.md §7.3 L432 (SearchTrace 保存); design.md §5.5 L298 (管理员调试视图)。
  Acceptance criteria: ADMIN 在 AI 回答上可展开 trace; trace 含 stage/durationMs/candidateCount; 可点击 event/entity 查看内容; 非管理员无 trace UI。
  QA scenarios: (happy) Playwright: ADMIN → AI 问答 → 展开 trace → 看到步骤 → Evidence `.omo/evidence/task-34-trace.png`; (failure) USER → 无 trace 按钮。
  Commit: Y | feat(client/admin): 检索trace调试视图 (管理员可见event/entity/步骤/耗时)

- [ ] 35. Phase 4 验收门 — 有来源回答, 低置信拒答
  What to do: 8 项验收: (1) typecheck; (2) test; (3) SSE 事件顺序 meta→source→delta→done; (4) 低置信→拒答不含 delta; (5) 多跳→≥2 event 证据链; (6) 来源权限: USER 不见内部; (7) 首字 P95 < 3s; (8) 幂等: 重复 reindex→0 新 chunk。
  Parallelization: Wave W4 | Blocked by: T32, T33, T34 | Blocks: 无
  References: PRD §11 L345, §7.4 L210-216, §3 L32。
  Acceptance criteria: 全部 8 项通过。
  QA scenarios: 全 PASS → Evidence `.omo/evidence/task-35-phase4-gate.txt`。
  Commit: N | (验收门)

### Wave 5 — Phase 5: 线索后台 (T36-T42)

- [ ] 36. 事件采集 API — `/api/v1/events` POST + 限流 + 白名单
  What to do: `server/src/modules/leads/events.api.ts`; POST `/api/v1/events` (公开, 限流 30/min); 接受白名单内行为: selection/product_view/material_preview/material_download/ai_question/ai_feedback/register; 不信任客户端分值 (PRD §9 L302); 采集 anonymousId (未登录) 或 userId (登录, 从 JWT 获取, 不信任客户端传的 userId); payload 含行为类型+时间戳+页面路径+额外参数。
  Must NOT do: 不信任客户端分值; 不接受白名单外的行为类型; 不信任客户端 userId。
  Parallelization: Wave W5 | Blocked by: T8 | Blocks: T37
  References: PRD §9 L302 (events 接口, 限流+不信任客户端分值), §7.5 L218-228 (线索来源+聚合规则)。
  Acceptance criteria: POST events → 200; 非白名单行为类型 → 400; 30/min 限流生效; 不含客户端 userId (从 JWT 获取)。
  QA scenarios: (happy) Supertest: POST 5 种行为 → 200 → Evidence `.omo/evidence/task-36-events.json`; (failure) 非白名单 → 400; 31次/分钟 → 429。
  Commit: Y | feat(server/leads): 事件采集API+白名单+限流+不信任客户端分值

- [ ] 37. 线索聚合 — 匿名合并 + 热度评分 + 状态流转
  What to do: `server/src/modules/leads/leads.service.ts`; 登录用户按 userId 聚合; 未登录按 anonymousId 聚合, 注册后合并 (LeadEvent 迁移到 userId, PRD §7.5 L226); 热度分: download>register>ai_question>solution_preview>selection (PRD §7.5 L227); 状态流转: NEW→ASSIGNED→FOLLOWING→CONVERTED/ABANDONED (PRD §7.5 L232-234); 注册成功后 5 秒内生成或合并线索 (PRD §7.5 L238); 同一用户保留完整行为明细不覆盖历史。
  Must NOT do: 不覆盖历史行为; 不在前端做聚合; 不跳过匿名→注册合并。
  Parallelization: Wave W5 | Blocked by: T36 | Blocks: T38
  References: PRD §7.5 L220-242 (聚合规则4条+状态流转+验收4条); tech.md §4.1 L203-204 (Lead/LeadEvent 模型)。
  Acceptance criteria: 匿名行为→LeadEvent 存在; 注册→LeadEvent 合并到 userId; 热度分计算正确; 状态流转正确; 注册后 5s 内 Lead 存在。
  QA scenarios: (happy) Vitest: 匿名 events → 注册 → Lead 合并到 userId, 热度分含 download 权重 → Evidence `.omo/evidence/task-37-aggregation.json`; (failure) 注册后 Lead 不存在 → FAIL。
  Commit: Y | feat(server/leads): 匿名合并+热度评分+状态流转+5s内生成

- [ ] 38. 线索后台 API — 列表/筛选/分配/状态/导出 + dataScope
  What to do: GET `/api/v1/admin/leads` (内部用户: 仅返回 assignedTo=自己; 审核员+:全量, PRD §9 L319); POST `/api/v1/admin/leads/{id}/assign` (审核员+); PATCH `/api/v1/admin/leads/{id}/status` (内部用户:仅自己的; 审核员+:全量); POST `/api/v1/admin/leads/export` (审核员+, 按当前筛选条件导出); 分配和状态变更加写 AuditLog。
  Must NOT do: 内部用户不能改派/导出/访问他人线索 (PRD §7.5 L240); 外部用户不可访问 (PRD §7.5 L242); dataScope 下推到 Repository (T8)。
  Parallelization: Wave W5 | Blocked by: T37 | Blocks: T40 | Can parallelize with: T39
  References: PRD §7.5 L238-242, §9 L319-322; tech.md §4.1 L203-204。
  Acceptance criteria: STAFF→仅自己线索; AUDITOR→全量; assign→AuditLog 记录; export→文件下载; 外部→403。
  QA scenarios: (happy) Supertest: AUDITOR 列表+assign+status+export → Evidence `.omo/evidence/task-38-leads-api.json`; (failure) STAFF→仅自己; USER→403。
  Commit: Y | feat(server/leads): 列表/筛选/分配/状态/导出+dataScope+审计

- [ ] 39. 审计日志查询 API — `/api/v1/admin/audit` (管理员)
  What to do: `server/src/modules/audit/audit.routes.ts`; GET `/api/v1/admin/audit` (管理员, 分页, 按 actorId/action/targetType/date 筛选, PRD §9 L324); 支持导出; payload 为 JSON (不展示敏感字段)。
  Must NOT do: 非管理员→403; payload 不含密码/token 明文。
  Parallelization: Wave W5 | Blocked by: T8 | Blocks: T41 | Can parallelize with: T38
  References: PRD §9 L324; tech.md §4.1 L207 (AuditLog 模型)。
  Acceptance criteria: GET audit → 分页+筛选正确; 非 ADMIN → 403; payload 不含敏感信息。
  QA scenarios: (happy) Supertest: ADMIN → audit 列表 → Evidence `.omo/evidence/task-39-audit.json`; (failure) STAFF → 403。
  Commit: Y | feat(server/audit): 审计日志查询/筛选/导出+管理员权限

- [ ] 40. 前端 — 线索管理后台 (表格+筛选+分配+状态+导出)
  What to do: `client/src/features/admin/leads/`; 后台布局: 固定侧栏 240px, 顶部 56px, 表格+分页 (design.md §5.7 L331-349); 支持搜索/筛选/分页/排序; 操作列固定右; 状态用标签不用纯文字; 高风险操作二次确认; 移动端降级为卡片列表。
  Must NOT do: 不做营销式卡片堆叠 (design.md §5.7 L329); 删除/下架/重建必须二次确认 (design.md §5.7 L348)。
  Parallelization: Wave W5 | Blocked by: T38 | Blocks: T42 | Can parallelize with: T41
  References: design.md §5.7 L327-349 (后台完整设计); PRD §7.5 L238-242。
  Acceptance criteria: 表格支持筛选+分页+排序; 操作列右固定; 状态标签; 分配弹窗确认; 导出按钮; STAFF 看到仅自己线索 (数据量正确)。
  QA scenarios: (happy) Playwright: AUDITOR → leads 列表 → assign → status → export → Evidence `.omo/evidence/task-40-leads-admin.png`; (failure) STAFF → 仅自己, 无 assign 按钮。
  Commit: Y | feat(client/admin/leads): 表格+筛选+分配+状态+导出+二次确认

- [ ] 41. 用户管理后端 API + 审计日志 API + 个人中心 + 后台前端
  What to do: **后端**: `server/src/modules/users/` 实现 `/api/v1/admin/users[/{id}]` GET/POST/PATCH/DELETE (管理员); 创建用户 (email+password+role), 编辑角色, 禁用用户 (status=INACTIVE → 撤销全部 RefreshToken, PRD §7.6 item 8), 写 AuditLog; `server/src/modules/audit/audit.routes.ts` GET `/api/v1/admin/audit` (管理员, 筛选 actor/action/target/date, 支持导出); **前端**: `client/src/features/admin/audit/` (表格+筛选+导出) + `client/src/features/admin/users/` (CRUD+角色+禁用, 二次确认) + `client/src/features/profile/` (`/profile` 个人中心: 显示用户信息+修改密码入口, tech.md §8.1 L461); 高风险操作二次确认。
  Must NOT do: 审计 payload 不展示敏感字段; 非管理员→403; 禁用用户时同步撤销 token 不可遗漏 (PRD §7.6 item 8)。
  Parallelization: Wave W5 | Blocked by: T39 | Blocks: T42 | Can parallelize with: T40
  References: design.md §5.7 (后台布局); PRD §9 L323-324 (users/audit 接口), §7.6 item 8 (禁用→撤销token); tech.md §8.1 L461 (`/profile` 路由)。
  Acceptance criteria: 后端: ADMIN CRUD users 正常; 禁用用户→该用户旧 Refresh Token 全部 revokedAt; 非管理员→403; 审计: 筛选+导出正确。前端: 用户管理 CRUD; `/profile` 显示信息+改密; 高风险二次确认。
  QA scenarios: (happy) Supertest: ADMIN 禁用用户→该用户 refresh→401; Playwright: ADMIN→users→创建 STAFF→列表出现 → Evidence `.omo/evidence/task-41-users-admin.png`; (failure) 禁用后 refresh→401; USER→admin→403。
  Commit: Y | feat(server/users)+feat(client/admin): 用户管理API+审计API+个人中心+后台前端

- [ ] 42. Phase 5 验收门 — 线索能按状态流转
  What to do: 6 项: (1) typecheck; (2) test; (3) 匿名行为→注册→线索合并; (4) STAFF 仅自己线索; (5) assign+status 写 AuditLog; (6) export 生成文件。
  Parallelization: Wave W5 | Blocked by: T40, T41 | Blocks: 无
  References: PRD §11 L346。
  Acceptance criteria: 全部 6 项通过。
  QA scenarios: 全 PASS → Evidence `.omo/evidence/task-42-phase5-gate.txt`。
  Commit: N | (验收门)

### Wave 6 — Phase 6: 上线加固 (T43-T48)

- [ ] 43. 性能验证 — 选型 P95<2s + AI 首字 P95<3s + PDF LCP P95<1.5s
  What to do: 使用 Supertest + k6/autocannon 或 Vitest bench; seed 100+ 产品; `/selection/match` P95<2s (PRD §3 L30); AI SSE 首字 P95<3s (PRD §3 L32); PDF 首屏渲染第 1 页 P95<1.5s (PRD §3 L31)。
  Must NOT do: 不用 mock 替代真实性能; 不跳过任何 KPI。
  Parallelization: Wave W6 | Blocked by: T18, T25, T35, T42 | Can parallelize with: T44-T48
  References: PRD §3 L28-36 (6 项成功率指标)。
  Acceptance criteria: 3 项 P95 达标; 来源覆盖率 100% (Supertest: 遍历 seed 知识库全部有效回答, 断言每条 `sources` 数组长度 ≥1); 推荐准确率 ≥90% (用 seed 产品固定标注集比对, agent 可执行)。
  QA scenarios: (happy) autocannon + Supertest → 3 项 P95 达标; Supertest: 10 条有效查询 → 全部 sources ≥1 → 来源覆盖率 100% → Evidence `.omo/evidence/task-43-perf.txt`; (failure) 任一 P95 超标或来源缺失 → 优化后重测。
  Commit: Y | test(perf): 选型P95<2s+AI首字P95<3s+PDF LCP<1.5s

- [ ] 44. 响应式验证 — 3 视口无横向滚动 + 数据量走查
  What to do: Playwright 3 固定视口截图: 1440×900, 1024×768, 390×844 (design.md §10 L487); 检查无横向滚动; seed 30+ 产品, 100+ 资料, 50+ 线索 (design.md §10 L486) → 走查无截断/跳动/异常空白; 6 态全部设计完成 (加载/空/错误/无权限/下架/资料缺失)。
  Must NOT do: 不跳过任何视口; 不用 <3 条数据走查 (design.md §10 L485 要求 30/100/50)。
  Parallelization: Wave W6 | Blocked by: T42 | Can parallelize with: T43, T45-T48
  References: design.md §10 L472-489 (视觉验收清单), §11 L491-500 (反模板检查 8 条); AGENTS.md L73 (四态)。
  Acceptance criteria: 3 视口截图无横向滚动; 30+产品/100+资料/50+线索走查通过; 6 态在页面上可见。
  QA scenarios: (happy) 3 视口截图 → Evidence `.omo/evidence/task-44-responsive/`; (failure) 移动端横向滚动 → FAIL。
  Commit: Y | test(responsive): 3视口截图+数据量走查+6态验证

- [ ] 45. 安全审计 — 越权/CSRF/限流/文件鉴权/输入校验
  What to do: Supertest + 手工: (1) 匿名篡改页码/Range→不可读第4页后 (复验); (2) CSRF: 缺 token→403 (复验); (3) 限流: 登录5/min, AI 10/min (复验); (4) RBAC: 匿名→admin→403, USER→leads→403; (5) 输入校验: XSS payload in param→sanitized; (6) 文件: 永久直链不存在; (7) 日志无敏感信息。
  Must NOT do: 不跳过任何安全检查; 不接受"应该安全"无证据。
  Parallelization: Wave W6 | Blocked by: T25, T35 | Can parallelize with: T43, T44, T46-T48
  References: PRD §10 L330 (安全), §12 L351 (越权检查); tech.md §3.3 L149-159 (8 中间件)。
  Acceptance criteria: 7 项安全检查全部通过。
  QA scenarios: (happy) 全 PASS → Evidence `.omo/evidence/task-45-security.txt`; (failure) 任一→阻塞上线。
  Commit: Y | test(security): 越权/CSRF/限流/RBAC/输入/文件/日志 7 项审计

- [ ] 46. 部署配置 — Docker 生产 compose + Nginx 反代 + README
  What to do: 生产 `docker-compose.prod.yml` (API + Worker 两服务, 复用同一镜像); Nginx 反代配置 (API /api, 前端 /, SSE 关闭缓冲+心跳); `README.md` 零启动文档 (含 docker compose, migrate, seed, build 步骤); `.env.example` 覆盖全部变量 (复验 T10)。
  Must NOT do: 不把生产密钥写入 compose; 不在 README 暴露内网 IP。
  Parallelization: Wave W6 | Blocked by: T42 | Can parallelize with: T43-T45, T47, T48
  References: AGENTS.md L76-98 (部署服务器+首次部署流程); tech.md §10 L544-552 (启动命令)。
  Acceptance criteria: `docker compose -f docker-compose.prod.yml up -d` 成功; Nginx 配置可反代; README 含零启动步骤; .env.example 完整。
  QA scenarios: (happy) 按 README 步骤 → 服务启动 → Evidence `.omo/evidence/task-46-deploy.txt`; (failure) 缺少步骤 → FAIL。
  Commit: Y | chore(deploy): Docker prod compose + Nginx + README 零启动文档

- [ ] 47. 备份恢复演练 — 数据库 + 文件存储
  What to do: PostgreSQL: pg_dump 备份 → 删库 → psql 恢复 → 验证数据一致; MinIO: 备份 bucket → 删除 → 恢复 → 验证文件存在; 记录恢复演练结果。
  Must NOT do: 不跳过恢复 (只备份不恢复不算); 不在上线后做首次演练 (上线前必须完成)。
  Parallelization: Wave W6 | Blocked by: T46 | Can parallelize with: T43-T45, T48
  References: PRD §10 L335 (备份), §12 L362 (恢复演练并记录结果)。
  Acceptance criteria: DB 恢复后数据行数一致; MinIO 恢复后文件可访问; 恢复演练报告存在。
  QA scenarios: (happy) pg_dump → drop → psql → count 一致 → Evidence `.omo/evidence/task-47-restore.txt`; (failure) 恢复后数据不一致 → FAIL。
  Commit: Y | chore(ops): 备份恢复演练+记录结果

- [ ] 48. 上线检查清单验证 — PRD §12 全部 12 项
  What to do: 逐项验证 PRD §12 L349-362: (1) P0 功能可演示; (2) 三类角色路径通过 (匿名/注册/管理员 E2E); (3) 文件无越权; (4) AI 有来源+无资料拒答; (5) 索引失败可见可重试; (6) 后台可维护全部资源; (7) PC/平板/手机无横向滚动; (8) 关键接口日志/限流/错误/审计; (9) .env.example 完整; (10) 空库迁移成功; (11) README 零启动; (12) 备份恢复演练完成。
  Must NOT do: 不跳过任何检查项; 不接受"应该通过"无证据。
  Parallelization: Wave W6 | Blocked by: T43-T47 | Blocks: 无
  References: PRD §12 L349-362 (上线检查清单 12 项)。
  Acceptance criteria: 12 项全部通过, 每项有证据文件。
  QA scenarios: 全 12 项 PASS → Evidence `.omo/evidence/task-48-golive-checklist.txt` → 可上线。
  Commit: Y | docs(golive): 上线检查清单 12 项验证通过

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  What to do: 核验全部 48 个 todo 是否完成, 每个验收门是否通过, 证据文件是否存在于 `.omo/evidence/`; 检查是否有偏离 PRD/tech.md/design.md 的实现。
- [ ] F2. Code quality review
  What to do: `pnpm lint && pnpm typecheck` 退出码 0; 检查无 `any`/`@ts-ignore`/`eslint-disable`; 检查无新增锁定列表外依赖。
- [ ] F3. Real manual QA
  What to do: Playwright E2E 全路径: 匿名选型→注册解锁→AI 问答→后台分配; 3 视口截图; 移动端核心操作。
- [ ] F4. Scope fidelity
  What to do: 检查 PRD §4.1 全部 9 项功能实现; PRD §4.2 不做项未实现; PRD §12 全部 12 项通过。

## Commit strategy
- 单分支 `main`, Conventional Commits 格式 (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`)。
- 每个 todo 完成后提交一次 (Commit: Y 的 todo); 验收门不产生提交 (Commit: N)。
- 提交前执行 `git status && git diff` 检查; 只提交本 todo 相关文件。
- Phase 验收门通过后打 tag: `v0.1-phase1`, `v0.2-phase2`, ... `v1.0-golive`。

## Success criteria
1. PRD §12 上线检查清单 12 项全部通过, 每项有证据文件。
2. `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` 全部退出码 0。
3. 三类角色路径 (匿名/注册/管理员) 通过 Playwright E2E。
4. 文件预览和下载无越权 (Supertest 越权测试通过)。
5. AI 回答有来源, 无资料时拒答 (SSE 事件序列正确)。
6. 知识库索引失败可见可重试, 重建期间无半成品参与检索。
7. 后台可维护产品/方案/资料/知识库/线索/用户 (全部 CRUD 可用)。
8. PC/平板/手机三视口无横向滚动 (Playwright 截图验证)。
9. 30+产品/100+资料/50+线索数据量走查无截断/跳动/异常空白。
10. 备份恢复演练完成并记录结果。
