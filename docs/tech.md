# 芯茂微产品选型与 DEMO 资料系统技术方案

## 1. 技术决策

第一版采用前后端分离、模块化单体后端、Docker Compose 部署。目标是减少架构阻力，让选型、资料、AI 问答和线索后台能稳定交付。

| 层级 | 选型 | 决策 |
| --- | --- | --- |
| 前端 | React 18 + TypeScript + Vite | 成熟、生态完整、适合复杂交互 |
| 路由 | React Router 7 | 页面路由清晰 |
| 服务端状态 | TanStack Query | 接口缓存、重试、加载态统一 |
| 客户端状态 | Zustand | 只存登录态、UI 状态和轻量上下文 |
| UI | Ant Design 5 + Tailwind CSS | 后台提效，前台保留高级定制空间 |
| 后端 | Node.js 20 + TypeScript + Express | 简洁、生态成熟、便于 AI 持续维护 |
| ORM | Prisma | 类型安全迁移和查询 |
| 主库 | PostgreSQL 16 + pgvector + pg_trgm | JSONB、全文排名、中文实体模糊匹配、向量检索和 SQL 多跳检索都在主库完成 |
| 缓存 | Redis 7 | 限流、热点查询、短期会话 |
| 文件存储 | MinIO，开发可用本地存储 | S3 兼容，便于迁移到 OSS |
| 日志 | Pino | JSON 日志，方便采集 |
| 校验 | Zod | 前后端共享校验思想 |
| 测试 | Vitest + React Testing Library + Supertest | 覆盖核心逻辑和接口 |

不在第一版使用微服务。选型、资料、AI 和线索先放在同一代码库与后端应用内，通过模块边界隔离；知识库索引以同代码库的独立 Worker 进程运行，避免 CPU/长任务阻塞 API。AI 知识库吸收 `Zleap-AI/SAG` 的事件/实体索引和 SQL 多跳检索思路，但不直接嵌入 SAG 原工作台，避免引入 Fastify、npm 项目结构和 React 19 依赖冲突。若后续复制或改写 SAG 源码，必须保留其 MIT License 和版权声明；仅复现公开算法思想时也需在决策记录中注明来源。

依赖准入遵循“一项能力只选一个实现”。除表中基础库外，第一版允许的领域依赖锁定为：`jose`（JWT）、`bcrypt`（密码哈希）、`ioredis`（缓存与 Streams）、`multer`（流式上传）、`@aws-sdk/client-s3`（MinIO）、`pdfjs-dist`（PDF 渲染与文本提取）、`pdf-lib`（拆页与水印）、`nodemailer`（邮件）、`axios`（前端请求）和 `@ant-design/icons`（图标）。新增运行时依赖必须先说明现有能力为何无法完成，并记录到本节；禁止为单一工具函数引入工具库。

## 2. 项目结构

```text
xinmaowei-selection/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── selection/
│   │   │   ├── products/
│   │   │   ├── solutions/
│   │   │   ├── ai-chat/
│   │   │   └── admin/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── routes/
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── selection/
│   │   │   ├── products/
│   │   │   ├── solutions/
│   │   │   ├── materials/
│   │   │   ├── knowledge/
│   │   │   ├── ai-chat/
│   │   │   ├── leads/
│   │   │   └── audit/
│   │   ├── routes/
│   │   ├── workers/
│   │   │   └── knowledge-index.worker.ts
│   │   └── types/
│   ├── tests/
│   └── package.json
├── docs/
│   ├── PRD.md
│   ├── tech.md
│   └── design.md
├── docker-compose.yml
├── .env.example
└── README.md
```

模块内部固定结构：

```text
modules/selection/
├── selection.routes.ts
├── selection.controller.ts
├── selection.service.ts
├── selection.repository.ts
├── selection.schema.ts
├── selection.types.ts
└── selection.test.ts
```

## 3. 后端架构

### 3.1 请求链路

```text
Route
  -> Auth/Role/RateLimit Middleware
  -> Controller
  -> Zod Schema Validation
  -> Service
  -> Repository / External Adapter
  -> Database / Redis / Storage / LLM
```

职责边界：

| 层 | 只做什么 |
| --- | --- |
| Route | 绑定路径、中间件、控制器 |
| Controller | 读取请求、调用校验、返回响应 |
| Service | 业务规则、事务、权限语义 |
| Repository | Prisma 查询，不写业务判断 |
| Adapter | 封装 MinIO、LLM、Embedding、Rerank、邮件等外部系统 |

### 3.2 统一响应

```ts
export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};
```

错误码：

| 范围 | 类型 |
| --- | --- |
| 1000-1999 | 参数错误 |
| 2000-2999 | 认证授权错误 |
| 3000-3999 | 业务错误 |
| 4000-4999 | 外部服务错误 |
| 5000-5999 | 服务端错误 |

### 3.3 安全中间件

| 中间件 | 要求 |
| --- | --- |
| `requestId` | 每个请求生成并写入日志 |
| `helmet` | 开启基础安全头 |
| `cors` | 只允许配置的前端域名 |
| `rateLimit` | 按 IP 和用户 ID 限流 |
| `auth` | 校验 Access Token |
| `roleGuard` | 校验 RBAC |
| `dataScope` | 将“仅本人/仅分配给自己”等范围条件下推到 Service/Repository 查询，不能查询全量后在前端过滤 |
| `csrf` | 对依赖 Cookie 的刷新、退出等写请求校验 Origin 与 CSRF Token |
| `errorHandler` | 捕获错误并脱敏返回 |

### 3.4 Token 策略

| Token | 有效期 | 存储 |
| --- | --- | --- |
| Access Token | 2 小时 | 前端内存或安全存储 |
| Refresh Token | 7 天 | HttpOnly Cookie，服务端保存哈希 |

Refresh Token 轮换使用，刷新后旧 token 失效；检测到已轮换 token 再次使用时撤销该用户全部 token。Cookie 必须启用 `HttpOnly`、生产环境 `Secure`、`SameSite=Lax` 和限定 `Path`。退出登录、修改密码或禁用账号时删除服务端记录。

## 4. 数据库设计

### 4.1 Prisma 模型基线

枚举必须包含：

```prisma
enum Role { USER STAFF AUDITOR ADMIN }
enum RecordStatus { DRAFT ACTIVE INACTIVE }
enum LeadStatus { NEW ASSIGNED FOLLOWING CONVERTED ABANDONED }
enum KnowledgeStatus { UPLOADED PROCESSING READY FAILED }
enum IndexJobStatus { PENDING PROCESSING SUCCEEDED FAILED }
enum ChatMessageStatus { STREAMING COMPLETED INTERRUPTED FAILED }
```

核心模型字段：

| 模型 | 必要字段 |
| --- | --- |
| `User` | `id`, `email`, `passwordHash`, `role`, `status`, `privacyVersion`, `privacyAcceptedAt`, `createdAt`, `updatedAt` |
| `RefreshToken` | `id`, `userId`, `tokenHash`, `familyId`, `expiresAt`, `revokedAt`, `createdAt` |
| `PasswordResetToken` | `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt` |
| `Product` | `id`, `model`, `series`, `status`, `params`, `advantages`, `datasheetMaterialId`, `createdAt`, `updatedAt` |
| `Solution` | `id`, `name`, `description`, `status`, `createdAt`, `updatedAt` |
| `ProductSolution` | `id`, `productId`, `solutionId`, `createdAt` |
| `Material` | `id`, `solutionId?`, `type`, `title`, `originalStorageKey`, `previewStorageKey`, `mimeType`, `pageCount`, `previewPages`, `status` |
| `KnowledgeDoc` | `id`, `materialId`, `title`, `sourceType`, `status`, `indexVersion`, `indexedAt`, `errorMessage` |
| `KnowledgeIndexJob` | `id`, `docId`, `indexVersion`, `status`, `attempts`, `errorMessage`, `startedAt`, `finishedAt`, `createdAt` |
| `KnowledgeChunk` | `id`, `docId`, `indexVersion`, `content`, `page`, `contentHash`, `embedding` |
| `KnowledgeEvent` | `id`, `chunkId`, `summary`, `eventType`, `embedding`, `createdAt` |
| `KnowledgeEntity` | `id`, `name`, `normalizedName`, `entityType`, `embedding`, `createdAt` |
| `KnowledgeEventEntity` | `id`, `eventId`, `entityId`, `role` |
| `SearchTrace` | `id`, `userId`, `query`, `mode`, `latencyMs`, `steps`, `createdAt` |
| `Lead` | `id`, `userId`, `anonymousId`, `score`, `status`, `assignedTo`, `lastActiveAt` |
| `LeadEvent` | `id`, `leadId`, `eventType`, `payload`, `createdAt` |
| `ChatSession` | `id`, `userId`, `title`, `createdAt`, `updatedAt` |
| `ChatMessage` | `id`, `sessionId`, `role`, `status`, `content`, `sources`, `feedback`, `createdAt` |
| `AuditLog` | `id`, `actorId`, `action`, `targetType`, `targetId`, `payload`, `createdAt` |

关系要求：

1. `Product N -> N Solution`，通过 `ProductSolution` 关联；`productId + solutionId` 唯一。
2. `Solution 1 -> N Material`；产品规格书可通过 `Product.datasheetMaterialId` 指向资料，因此 `Material.solutionId` 可空。
3. `Material 0/1 -> 1 KnowledgeDoc`。
4. `KnowledgeDoc 1 -> N KnowledgeIndexJob` 和 `KnowledgeDoc 1 -> N KnowledgeChunk`。
5. `KnowledgeChunk 1 -> 1 KnowledgeEvent`。
6. `KnowledgeEvent N -> N KnowledgeEntity`，通过 `KnowledgeEventEntity` 关联。
7. `User 1 -> N RefreshToken`、`User 1 -> N PasswordResetToken`。
8. `Lead 1 -> N LeadEvent`。
9. `ChatSession 1 -> N ChatMessage`。

向量列使用 Prisma `Unsupported("vector(1536)")` 映射；启用扩展、创建 HNSW 索引、向量距离查询和全文排名使用版本化 SQL migration 与参数化 `$queryRaw`。`EMBEDDING_DIMENSIONS` 必须与 migration 中的维度一致，修改模型或维度时新建索引版本并全量重建，不允许原地混用。

### 4.2 索引要求

1. `Product.model` 唯一索引。
2. `Product.params` 使用 PostgreSQL JSONB，后续按真实查询加 GIN 索引。
3. `Lead.userId + status + lastActiveAt` 复合索引。
4. `LeadEvent.leadId + createdAt` 复合索引。
5. `AuditLog.actorId + createdAt`、`AuditLog.targetType + targetId` 索引。
6. `KnowledgeChunk.content` 建 `tsvector` GIN 索引，用 `ts_rank_cd` 做英文、型号和数字词项排名；不得把 PostgreSQL 原生排名描述为 BM25。
7. `KnowledgeEntity.normalizedName` 建 B-tree 唯一索引与 `pg_trgm` GIN 索引，中文实体采用规范化精确匹配、前缀匹配和 trigram 相似度召回。
8. `KnowledgeChunk.embedding`、`KnowledgeEvent.embedding`、`KnowledgeEntity.embedding` 使用 pgvector HNSW 索引，并固定一致的距离度量。
9. `KnowledgeEventEntity.eventId + entityId + role` 建唯一索引，支持 SQL 多跳扩展并保留同一实体在事项中的不同角色。
10. `KnowledgeChunk.docId + indexVersion + contentHash` 建唯一索引，保证重复任务幂等。
11. `RefreshToken.tokenHash`、`PasswordResetToken.tokenHash` 建唯一索引；只存哈希，原始令牌不得落库。
12. `KnowledgeIndexJob.docId + indexVersion` 建唯一索引，同一版本不得重复创建任务。

## 5. 选型引擎

### 5.1 数据结构

```ts
export type SelectionInput = {
  inputVoltageMin: number;
  inputVoltageMax: number;
  outputVoltage: number;
  outputCurrent: number;
  applicationType?: string;
  efficiencyLevel?: string;
  standbyPowerMax?: number;
  maxAmbientTemp?: number;
  pcbaSize?: {
    width: number;
    height: number;
  };
  certifications?: string[];
  requiresPfc?: boolean;
};

export type MatchResult = {
  productId: string;
  model: string;
  series: string;
  params: Record<string, unknown>;
  advantages: string[];
  datasheetMaterialId?: string | null;
  matchLevel: "exact" | "approximate" | "fallback";
  score: number;
  reasons: string[];
  diffs: string[];
};
```

### 5.2 评分规则

| 维度 | 权重 |
| --- | ---: |
| 电气参数 | 45 |
| 应用类型 | 15 |
| 能效与待机功耗 | 15 |
| 合规认证 | 15 |
| 环境与尺寸 | 10 |

规则：

1. 必填参数缺失直接返回参数错误。
2. 电气参数不覆盖用户需求时不可标记为精确匹配。
3. 差异说明必须面向用户可读，例如“输出电流低于需求 0.2A”。
4. 精准匹配需要输入电压范围、输出电压和输出电流四项核心参数；参数不完整时前端展示热门产品和补参提示，不调用匹配接口。
5. 应用类型、能效、认证和环境尺寸是可选加权项；未指定应用类型时按中性满分处理，不制造 400 错误。
6. 热门推荐只在用户参数为空或核心电气参数不完整时使用。
7. 产品状态非 `ACTIVE` 不进入外部推荐。

## 6. 文件与资料服务

### 6.1 存储策略

开发环境可使用本地磁盘，生产默认 MinIO。业务代码只依赖 `StorageAdapter`，不得直接依赖具体存储 SDK。

```ts
export type SignedUrlOptions = {
  storageKey: string;
  expiresInSeconds: number;
  disposition: "inline" | "attachment";
};

export interface StorageAdapter {
  createSignedUrl(options: SignedUrlOptions): Promise<string>;
  putObject(storageKey: string, file: Buffer, mimeType: string): Promise<void>;
  removeObject(storageKey: string): Promise<void>;
}
```

### 6.2 权限规则

1. 预览接口必须由后端控制页码范围。
2. 下载接口只返回短时签名链接。
3. PDF 水印在下载前生成临时文件或走流式处理。
4. 每次下载写入 `LeadEvent` 和 `AuditLog`。
5. 上传 PDF 后异步生成独立的匿名预览件，仅包含允许页；匿名接口只能签发该派生对象，不能签发原文件后依靠前端隐藏页面。
6. 原文件、预览件和水印件分别记录 `storageKey`、文件哈希与生成状态；派生失败时资料不可上架。
7. 上传接口限制配置化的文件大小与类型白名单，同时校验扩展名、声明 MIME 和文件签名字节；对象默认存入私有桶且状态为草稿。
8. 非预览类型一律使用 `Content-Disposition: attachment`，响应补充 `X-Content-Type-Options: nosniff`；文件名由服务端安全生成，不接受路径片段。

## 7. SAG 知识库与 AI 问答

### 7.1 索引流程

```text
上传资料
  -> 创建索引任务（docId + indexVersion 唯一）
  -> Worker 文本提取
  -> 清洗
  -> 分块
  -> 每个 chunk 提取 1 个完整 event
  -> 每个 chunk 提取多个 entities
  -> chunk / event / entity 向量化
  -> 在事务中写入 PostgreSQL + pgvector
  -> 建立 event <-> entity 关联
  -> 完整性检查
  -> 原子切换 KnowledgeDoc.indexVersion 并标记 READY
```

索引任务由 Redis Streams 承载，API 只负责创建任务，Worker 使用 consumer group 消费。任务必须支持幂等、有限重试、超时恢复与失败原因落库；同一文档同一版本只允许一个活动任务。处理中和失败版本不参与线上检索，删除或下架资料时立即从可检索范围排除。

分块默认值：

| 参数 | 值 |
| --- | --- |
| chunk size | 500-800 中文字符 |
| overlap | 80-120 中文字符 |
| 向量候选数 | 30 |
| SQL 扩展最大跳数 | 2 |
| 最终证据数 | 5 |
| 接受阈值 | 由离线标注集校准，通过环境变量配置 |

### 7.2 检索模式

默认使用 SAG 极速模式：

```text
用户问题
  -> entity 精确/前缀/pg_trgm 检索
  -> chunk 全文排名
  -> chunk/event 向量召回
  -> SQL join 扩展共享 entity 的 event
  -> 合并去重并 rerank 选择最终证据
  -> 生成带来源回答
```

标准模式作为配置项：

```text
用户问题
  -> LLM 抽取 query entities
  -> entity / event / chunk 多路召回
  -> SQL 多跳扩展
  -> LLM 或 rerank 模型精排
  -> 生成带来源回答
```

降级策略：

1. pgvector 或 rerank 不可用时，允许用全文检索 + SQL 多跳扩展返回候选。
2. event/entity 抽取失败时，该文档片段不得进入高置信回答，只能作为低置信候选。
3. 普通向量 TopK 仅作为兜底，不作为默认路径。
4. LLM 不可用时不生成自由文本；返回结构化来源列表和“生成服务暂不可用”，不得把检索片段伪装成完整回答。
5. 每次检索先按资料状态和调用者权限构造候选集，再执行相似度查询，禁止召回后仅在前端隐藏无权限来源。

### 7.3 Adapter 接口

```ts
export type ChatSource = {
  docId: string;
  eventId?: string;
  title: string;
  page?: number;
  snippet: string;
  entities: string[];
  score: number;
};

export type SearchTraceStep = {
  stage: "entity" | "fulltext" | "vector" | "expand" | "rerank";
  durationMs: number;
  candidateCount: number;
  selectedIds: string[];
};

export type GenerateAnswerInput = {
  question: string;
  sources: ChatSource[];
};

export interface LlmAdapter {
  generateAnswer(input: GenerateAnswerInput): AsyncIterable<string>;
}

export interface KnowledgeSearchAdapter {
  search(input: {
    query: string;
    mode: "fast" | "standard";
    topK: number;
    returnTrace: boolean;
  }): Promise<{
    sources: ChatSource[];
    trace: SearchTraceStep[];
    latencyMs: number;
  }>;
}
```

回答约束：

1. 没有超过阈值的来源时直接拒答。
2. Prompt 必须要求只基于来源回答。
3. 输出完成后保存完整内容和来源。
4. 保存 SearchTrace，后台可查看命中 event、entity、召回步骤和耗时。

### 7.4 流式响应协议

`POST /api/v1/ai/chat` 使用 SSE，不套用普通 `ApiResponse<T>`。响应头为 `Content-Type: text/event-stream`，事件固定为：

| 事件 | 数据 | 说明 |
| --- | --- | --- |
| `meta` | `messageId`, `sessionId` | 建立本轮消息 |
| `source` | `ChatSource` | 在正文前或正文中增量返回来源 |
| `delta` | `content` | 文本增量 |
| `done` | `messageId`, `usage`, `latencyMs` | 完整消息已落库 |
| `error` | `code`, `message`, `retryable` | 流内错误，不返回堆栈 |

客户端断开时服务端取消下游生成请求；若正文已产生则保存为 `INTERRUPTED`，不得标记为完整回答。网关必须关闭该路由的响应缓冲并设置心跳，首个业务事件前发生的错误仍使用统一 JSON 错误响应。

## 8. 前端架构

### 8.1 路由

| 路径 | 页面 | 权限 |
| --- | --- | --- |
| `/` | 首页 | 公开 |
| `/selection` | 选型页 | 公开 |
| `/products/:id` | 产品详情 | 公开 |
| `/solutions/:id` | 方案资料 | 公开，内容按权限裁剪 |
| `/ai-chat` | AI 问答 | 登录 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/profile` | 个人中心 | 登录 |
| `/admin` | 后台首页 | 内部角色 |
| `/admin/products` | 产品管理 | 管理员 |
| `/admin/solutions` | 方案管理 | 管理员 |
| `/admin/materials` | 资料管理 | 管理员 |
| `/admin/knowledge` | 知识库管理 | 管理员 |
| `/admin/leads` | 线索管理 | 内部用户+，内部用户仅访问分配给自己的数据 |
| `/admin/users` | 用户管理 | 管理员 |

### 8.2 API 客户端

1. 普通请求使用 `apiClient`，自动附加内存中的 Access Token，并解包 `ApiResponse<T>`。
2. 首次收到 Access Token 过期的 `401` 时，只允许发起一个刷新请求；并发失败请求进入等待队列，刷新成功后各重试一次。
3. 刷新请求携带 HttpOnly Cookie 与 CSRF Token，且不经过普通 401 拦截器，避免递归刷新。
4. 刷新失败、账号禁用或重试后仍为 `401` 才清理会话并跳转登录；跳转时保存当前站内地址用于登录后恢复。
5. SSE 使用独立客户端，不经过 Axios JSON 解包；断线仅在尚未收到 `done` 且错误可重试时允许用户主动重试，不能自动重复提交问题。
6. 非幂等请求默认不自动重试；列表查询由 TanStack Query 按错误类型控制重试。

### 8.3 状态边界

| 状态 | 工具 |
| --- | --- |
| 登录用户、Token、全局弹窗 | Zustand |
| 接口数据、分页、详情、列表 | TanStack Query |
| 表单状态 | React Hook Form |
| URL 筛选条件 | React Router Search Params |

不得把接口列表长期复制到 Zustand，避免缓存不一致。

## 9. 环境变量

```bash
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xinmaowei
REDIS_URL=redis://localhost:6379

PGVECTOR_ENABLED=true
KNOWLEDGE_SEARCH_MODE=fast
KNOWLEDGE_INDEX_VERSION=v1
KNOWLEDGE_SCORE_THRESHOLD=0.72
INDEX_JOB_MAX_RETRIES=3
SSE_HEARTBEAT_MS=15000
RERANK_PROVIDER=openai-compatible
RERANK_BASE_URL=
RERANK_API_KEY=
RERANK_MODEL=qwen3-rerank

STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./uploads
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=xinmaowei
STORAGE_SIGNING_SECRET=replace_with_at_least_32_random_characters

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
CSRF_SECRET=replace_me

LLM_PROVIDER=openai-compatible
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
EMBEDDING_PROVIDER=openai-compatible
EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@example.com

VITE_API_BASE_URL=/api/v1
```

## 10. 本地启动命令

```bash
pnpm install
docker compose up -d postgres redis minio
pnpm --filter server prisma:migrate
pnpm --filter server dev
pnpm --filter server worker:knowledge
pnpm --filter client dev
```

`prisma:migrate` 必须执行版本化 migration，其中包含 `CREATE EXTENSION IF NOT EXISTS vector`、`pg_trgm`、向量列与索引 SQL，不额外维护未定义的 `prisma:vector` 命令。API、知识库 Worker 和前端开发服务分别在独立终端运行；生产 Compose 同样将 API 与 Worker 定义为两个服务，但复用同一镜像。

必须提供种子数据：

1. 管理员账号。
2. 至少 5 个产品。
3. 至少 2 个方案。
4. 至少 1 份可预览 PDF。
5. 至少 2 份知识库文档、10 条片段，并生成可覆盖单跳与多跳样例的 chunk、event、entity、event-entity 关联。

## 11. 测试策略

| 范围 | 工具 | 必测 |
| --- | --- | --- |
| 选型算法 | Vitest | 精确、近似、兜底、空参数 |
| API | Supertest | 权限、参数校验、错误码 |
| 前端组件 | React Testing Library | 表单、列表、解锁弹窗 |
| E2E | Playwright | 匿名选型、注册解锁、SAG 问答、后台分配 |
| 安全 | 手工 + 自动检查 | 越权预览、下载鉴权、限流 |
| 检索评测 | 固定标注集 | 单跳/多跳命中、无答案拒答、无权限资料隔离、P95 延迟 |

上线前最低测试：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm e2e`

## 12. 开发顺序

1. 初始化工程、Lint、TypeScript、Docker、CI。
2. 建库和迁移，写 seed。
3. 实现认证、RBAC、错误处理、日志。
4. 实现产品、方案、资料后台 CRUD。
5. 实现选型算法和选型页面。
6. 实现 PDF 预览、注册解锁、下载审计。
7. 实现 SAG 知识库索引和 AI 问答。
8. 实现线索聚合、分配、导出。
9. 做响应式、性能、安全和 E2E 验收。

## 13. 禁止事项

1. 禁止在业务代码中使用 `any`、`@ts-ignore`、`eslint-disable` 绕过类型问题。
2. 禁止接口直接返回存储永久地址。
3. 禁止 AI 无来源回答技术结论。
4. 禁止把 SAG 原项目作为独立工作台硬嵌入本项目；只能按模块吸收检索内核。
5. 禁止前端只做静态假数据页面而不接入真实接口。
6. 禁止后台管理和外部用户端共用无权限判断的接口。
7. 禁止上传资料默认上架。
8. 禁止把敏感信息写入日志。
9. 禁止把 PostgreSQL `ts_rank` 描述为 BM25，或在未校准标注集的情况下承诺固定相似度阈值有效。
10. 禁止在 API 请求进程内同步执行 PDF 解析、event/entity 抽取和批量向量化。
