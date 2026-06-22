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
| 主库 | PostgreSQL 16 | JSONB 与复杂查询能力适合产品参数 |
| 缓存 | Redis 7 | 限流、热点查询、短期会话 |
| 向量库 | Qdrant | RAG 检索轻量可靠 |
| 文件存储 | MinIO，开发可用本地存储 | S3 兼容，便于迁移到 OSS |
| 日志 | Pino | JSON 日志，方便采集 |
| 校验 | Zod | 前后端共享校验思想 |
| 测试 | Vitest + React Testing Library + Supertest | 覆盖核心逻辑和接口 |

不在第一版使用微服务。选型、资料、AI 和线索先放在同一后端应用内，通过模块边界隔离，后续按压力点拆分。

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
  -> Database / Redis / Qdrant / Storage / LLM
```

职责边界：

| 层 | 只做什么 |
| --- | --- |
| Route | 绑定路径、中间件、控制器 |
| Controller | 读取请求、调用校验、返回响应 |
| Service | 业务规则、事务、权限语义 |
| Repository | Prisma 查询，不写业务判断 |
| Adapter | 封装 MinIO、Qdrant、LLM、邮件等外部系统 |

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
| `errorHandler` | 捕获错误并脱敏返回 |

### 3.4 Token 策略

| Token | 有效期 | 存储 |
| --- | --- | --- |
| Access Token | 2 小时 | 前端内存或安全存储 |
| Refresh Token | 7 天 | HttpOnly Cookie，服务端保存哈希 |

Refresh Token 轮换使用，刷新后旧 token 失效。退出登录时删除服务端记录。

## 4. 数据库设计

### 4.1 Prisma 模型基线

枚举必须包含：

```prisma
enum Role { USER STAFF AUDITOR ADMIN }
enum RecordStatus { DRAFT ACTIVE INACTIVE }
enum LeadStatus { NEW ASSIGNED FOLLOWING CONVERTED ABANDONED }
```

核心模型字段：

| 模型 | 必要字段 |
| --- | --- |
| `User` | `id`, `email`, `passwordHash`, `role`, `status`, `createdAt`, `updatedAt` |
| `Product` | `id`, `model`, `series`, `status`, `params`, `advantages`, `datasheetId`, `createdAt`, `updatedAt` |
| `Solution` | `id`, `productId`, `name`, `description`, `status`, `createdAt`, `updatedAt` |
| `Material` | `id`, `solutionId`, `type`, `title`, `storageKey`, `mimeType`, `pageCount`, `previewPages`, `status` |
| `KnowledgeDoc` | `id`, `materialId`, `title`, `sourceType`, `status`, `indexedAt` |
| `KnowledgeChunk` | `id`, `docId`, `content`, `page`, `vectorId` |
| `Lead` | `id`, `userId`, `anonymousId`, `score`, `status`, `assignedTo`, `lastActiveAt` |
| `LeadEvent` | `id`, `leadId`, `eventType`, `payload`, `createdAt` |
| `ChatSession` | `id`, `userId`, `title`, `createdAt`, `updatedAt` |
| `ChatMessage` | `id`, `sessionId`, `role`, `content`, `sources`, `feedback`, `createdAt` |
| `AuditLog` | `id`, `actorId`, `action`, `targetType`, `targetId`, `payload`, `createdAt` |

关系要求：

1. `Product 1 -> N Solution`。
2. `Solution 1 -> N Material`。
3. `Material 0/1 -> 1 KnowledgeDoc`。
4. `KnowledgeDoc 1 -> N KnowledgeChunk`。
5. `Lead 1 -> N LeadEvent`。
6. `ChatSession 1 -> N ChatMessage`。

### 4.2 索引要求

1. `Product.model` 唯一索引。
2. `Product.params` 使用 PostgreSQL JSONB，后续按真实查询加 GIN 索引。
3. `Lead.userId + status + lastActiveAt` 复合索引。
4. `LeadEvent.leadId + createdAt` 复合索引。
5. `AuditLog.actorId + createdAt`、`AuditLog.targetType + targetId` 索引。

## 5. 选型引擎

### 5.1 数据结构

```ts
export type SelectionInput = {
  inputVoltageMin: number;
  inputVoltageMax: number;
  outputVoltage: number;
  outputCurrent: number;
  applicationType: string;
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
4. 热门推荐只在用户参数为空或极少时使用。
5. 产品状态非 `ACTIVE` 不进入外部推荐。

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

## 7. RAG 与 AI 问答

### 7.1 索引流程

```text
上传资料
  -> 文本提取
  -> 清洗
  -> 分块
  -> 向量化
  -> 写入 Qdrant
  -> 写入 KnowledgeDoc / KnowledgeChunk
```

分块默认值：

| 参数 | 值 |
| --- | --- |
| chunk size | 500-800 中文字符 |
| overlap | 80-120 中文字符 |
| topK | 5 |
| score threshold | 0.72 |

### 7.2 LLM Adapter

```ts
export type ChatSource = {
  docId: string;
  title: string;
  page?: number;
  snippet: string;
};

export type GenerateAnswerInput = {
  question: string;
  sources: ChatSource[];
};

export interface LlmAdapter {
  generateAnswer(input: GenerateAnswerInput): AsyncIterable<string>;
}
```

回答约束：

1. 没有超过阈值的来源时直接拒答。
2. Prompt 必须要求只基于来源回答。
3. 输出完成后保存完整内容和来源。

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
| `/admin/leads` | 线索管理 | 审核员+ |
| `/admin/users` | 用户管理 | 管理员 |

### 8.2 API 客户端

```ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
```

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

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=./uploads
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=xinmaowei

JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me

LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small

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
docker compose up -d postgres redis qdrant minio
pnpm --filter server prisma:migrate
pnpm --filter server dev
pnpm --filter client dev
```

必须提供种子数据：

1. 管理员账号。
2. 至少 5 个产品。
3. 至少 2 个方案。
4. 至少 1 份可预览 PDF。
5. 至少 3 条知识库片段。

## 11. 测试策略

| 范围 | 工具 | 必测 |
| --- | --- | --- |
| 选型算法 | Vitest | 精确、近似、兜底、空参数 |
| API | Supertest | 权限、参数校验、错误码 |
| 前端组件 | React Testing Library | 表单、列表、解锁弹窗 |
| E2E | Playwright | 匿名选型、注册解锁、AI 问答、后台分配 |
| 安全 | 手工 + 自动检查 | 越权预览、下载鉴权、限流 |

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
7. 实现知识库索引和 AI 问答。
8. 实现线索聚合、分配、导出。
9. 做响应式、性能、安全和 E2E 验收。

## 13. 禁止事项

1. 禁止在业务代码中使用 `any`、`@ts-ignore`、`eslint-disable` 绕过类型问题。
2. 禁止接口直接返回存储永久地址。
3. 禁止 AI 无来源回答技术结论。
4. 禁止前端只做静态假数据页面而不接入真实接口。
5. 禁止后台管理和外部用户端共用无权限判断的接口。
6. 禁止上传资料默认上架。
7. 禁止把敏感信息写入日志。
