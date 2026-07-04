# OpenCode 第三轮整改执行单

> 目标：修复后台真实业务闭环问题，完成系统设置聚合、AI 配置管理和可验收的管理后台体验。禁止只修表象；必须按前后端契约、数据语义、权限闭环逐项整改。

## 0. 当前基线

- 分支：`opencode/admin-ui-redesign`
- 基线提交：`eafd89c`
- 线上地址：`http://172.16.172.85:8082`
- 当前线上前端 hash：`index-1sGhmCar.js`
- 已知本地未跟踪文件：`cookies.txt`，不要提交。

开始前必须执行：

```bash
git fetch origin --prune
git switch opencode/admin-ui-redesign
git pull --ff-only
git status --short --branch
```

禁止直接合并 `master`。禁止改动 `.env.local`、真实密钥、cookie、截图缓存。

## 1. 已确认的根因与必须修复项

### 1.1 字段配置 optionsJson 契约冲突

现状：

- 前端字段设置把选项解析成 `{ label, value }[]`。
- 前端产品表单按 `o.label / o.value` 渲染下拉。
- 后端字段 schema 只接受 `string[]`。
- seed 中产品字段 optionsJson 也是 `string[]`。

结果：

- 产品管理下拉项为空或不显示。
- 资料字段设置创建单选/多选字段失败。
- 字段配置数据长期不一致。

必须修：

1. 统一字段选项结构为：

```ts
type FieldOption = { label: string; value: string };
```

2. 后端 `product field-config` 和 `material field-config` 的 create/update schema 必须接受并校验 `FieldOption[]`。
3. seed 中所有 `optionsJson` 改成 `FieldOption[]`。
4. 为兼容旧数据，后端返回前必须把 `string[]` 规范化成 `FieldOption[]`。
5. 产品表单、资料字段表单、产品字段表单全部复用同一个 options 规范化函数，禁止分散解析。
6. 增加测试：
   - 创建 `single_select` 字段，传 `{label,value}[]` 成功。
   - 创建 `multi_select` 字段，传 `{label,value}[]` 成功。
   - 历史 `string[]` 返回时被转换成 `{label,value}[]`。

### 1.2 产品参数编辑与展示不一致

现状：

- `model/series/status` 既作为固定字段存在，又在 `product_field_configs` 中作为字段配置存在。
- 产品表单固定渲染 `model/series/status`，又遍历所有 fieldConfigs。
- 编辑时容易出现重复字段或重复语义，用户反馈“2 个产品优势/参数不匹配”属于同类问题。

必须修：

1. 字段配置必须区分：
   - 固定字段：`model`、`series`、`status`、`advantages`
   - 动态参数字段：只存入 `Product.params`
2. `ProductFormModal` 渲染动态字段时必须过滤固定字段。
3. `ProductFieldSettingsPage` 可以展示固定字段，但必须标记“系统字段”，禁止删除，且不参与 `params` 渲染。
4. `advantages` 不应出现在动态参数配置里；如要可配置，必须单独作为固定字段设置，不允许混入 `params`。
5. 产品列表“关键参数”不能继续硬编码 `outputVoltage/outputCurrent/inputVoltageMin/inputVoltageMax`，必须根据启用的动态字段生成摘要。

### 1.3 删除语义混乱

现状：

- 产品、方案、资料删除实际是软删除：只把 `status` 改为 `INACTIVE`。
- 管理列表默认“全部”包含 `INACTIVE`。
- 前端提示“已删除”，用户仍能看到记录，造成“无法删除”的错觉。

必须二选一，并写入代码和 UI：

方案 A（推荐）：后台删除 = 软删除到回收站。

- 列表默认只展示 `ACTIVE + DRAFT`，不展示 `INACTIVE`。
- 状态筛选增加“回收站/已删除”。
- 删除提示改为“已移入回收站”。
- 删除按钮对 `INACTIVE` 记录隐藏或改成“恢复/彻底删除”。

方案 B：后台删除 = 真删除。

- 删除前检查关联关系。
- 有关联时给出明确错误，如“该产品仍被 3 个方案引用，不能删除”。
- 真删除必须清理关联表和存储文件。

当前项目更适合方案 A。

必须覆盖产品、方案、资料三类。

### 1.4 方案关联产品仍不可靠

现状：

- 方案编辑只从 `listProducts({ status: 'ACTIVE' })` 取候选。
- 如果已关联产品不是 ACTIVE、被软删除或分页遗漏，编辑表单会丢失选项。
- 方案列表不显示已关联产品，用户无法确认关联是否生效。

必须修：

1. 新增后台产品 options API，返回用于选择器的轻量数据：
   - `id`
   - `model`
   - `series`
   - `status`
2. 方案编辑时 options 必须包含：
   - 当前已关联产品
   - ACTIVE 候选产品
3. 方案详情接口必须稳定返回 `products` 和 `productIds`。
4. 方案列表必须显示关联产品摘要和数量。
5. 方案保存后立即 refetch 当前详情和列表，确认回填正确。
6. 增加 E2E/API 验收：创建方案选择多个产品，编辑后回填相同 `productIds`。

### 1.5 资料关联方案/产品不完整

现状：

- 资料上传/编辑有下拉，但列表接口不返回 `solutionName/productModel`。
- 前端表格尝试显示 `solutionName/productModel`，实际拿不到。
- options 只取 ACTIVE，编辑历史关联容易丢选项。

必须修：

1. `Material` 列表和详情 include：
   - `solution.name`
   - `product.model`
   - `product.series`
2. API 响应增加：
   - `solutionName`
   - `productModel`
   - `productSeries`
3. 上传/编辑 options 同样必须包含当前已关联项。
4. 删除语义按 1.3 统一。
5. 资料字段设置不能只是配置表，至少要明确：
   - 哪些字段控制资料固定字段
   - 哪些字段进入 `Material.metadata`（如需要，新增 JSON 字段和 migration）
6. 如果实现动态资料字段，必须新增 `Material.metadata Json`，否则资料字段设置页面没有实际业务意义。

### 1.6 角色管理 API 响应契约错误

现状：

- 后端 `GET /api/v1/admin/roles` 返回数组。
- 前端 `listRoles()` 按 `{ items, total }` 读取。
- 后端 `GET /api/v1/admin/roles/permissions` 返回分组数组。
- 前端 `listPermissions()` 按 `{ items }` 读取。

结果：

- 角色管理页面加载失败。
- 新建用户无法选择 RBAC 角色。

必须修：

1. 后端改为稳定响应：

```ts
GET /admin/roles -> { items: RoleListItem[], total: number }
GET /admin/roles/permissions -> { items: PermissionItem[], groups: PermissionGroup[] }
```

2. 或前端按后端现状读取。推荐后端统一成对象，便于扩展分页。
3. `RoleFormModal`、`UserFormModal` 都必须通过真实 API 加载角色和权限。
4. 增加测试：
   - `GET /admin/roles` 前端解析成功。
   - 用户创建时 `roleIds` 提交后，`/auth/login` 返回对应 permissions。

### 1.7 RBAC 前端仍混用旧角色守卫

现状：

- `AdminLayout` 菜单基本按 permission 判断。
- `App.tsx` 后台路由仍大量写 `RouteGuard roles={['ADMIN']}`。
- `RouteGuard` 只支持旧枚举角色，不支持 permission。
- `MainLayout` 后台入口仍按 `user.role` 判断。

结果：

- 自定义角色即便有权限，也可能进不了页面。
- 新 RBAC 没有真正闭环。

必须修：

1. `RouteGuard` 增加 `permissions?: string[]` 和 `mode?: 'all' | 'any'`。
2. 后台路由全部改为 permission 守卫。
3. 旧 `roles` 仅作为兼容兜底，不能作为后台主逻辑。
4. `MainLayout` 后台入口按 `admin.dashboard.read` 权限显示。
5. 改角色权限后需要重新登录或刷新 `/auth/me`，并提示权限缓存刷新机制。

### 1.8 系统设置分组

用户明确要求：

- `产品字段`
- `资料字段`
- `角色管理`
- `AI及模型设置`

都应收纳至“系统设置”。

必须修：

1. `AdminLayout` 支持菜单分组/子菜单。
2. 新结构建议：
   - 驾驶舱
   - 内容管理：产品、方案、资料、知识库
   - 运营管理：线索、用户、审计
   - 系统设置：产品字段、资料字段、角色权限、AI及模型
3. 面包屑同步显示 `系统设置 / 产品字段`。
4. 移动端 Drawer 同样显示分组，不允许只改桌面端。

### 1.9 AI 及模型设置缺失

现状：

- AI 配置全部来自环境变量：
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_MODEL`
  - `EMBEDDING_BASE_URL`
  - `EMBEDDING_API_KEY`
  - `EMBEDDING_MODEL`
  - `EMBEDDING_DIMENSIONS`
  - `RERANK_MODEL`
- 没有后台设置页面。
- prompt 写死在代码中。

必须新增：

1. 数据模型：

```ts
AiProviderSetting {
  id
  providerType // llm | embedding | rerank
  name
  baseUrl
  apiKeyEncrypted
  model
  dimensions
  enabled
  isDefault
  createdAt
  updatedAt
}

AiPromptSetting {
  id
  key // extraction | entity_query | rerank | chat_system
  title
  content
  enabled
  version
  createdAt
  updatedAt
}
```

2. API：
   - `GET /api/v1/admin/ai-settings`
   - `PATCH /api/v1/admin/ai-settings/:id`
   - `POST /api/v1/admin/ai-settings/test`
   - `GET /api/v1/admin/ai-prompts`
   - `PATCH /api/v1/admin/ai-prompts/:id`
3. 权限：
   - `settings.ai.read`
   - `settings.ai.write`
4. 安全：
   - API Key 返回必须脱敏。
   - 日志和审计不得记录明文 key。
   - 保存时加密或至少使用服务端密钥对称加密；不能明文落库。
5. 运行时：
   - 数据库配置优先，环境变量作为 fallback。
   - 修改模型/embedding dimensions 时提示需要重建索引。
6. UI：
   - 放入 `系统设置 / AI及模型设置`。
   - 支持 LLM、Embedding、Rerank 分 tab。
   - 支持系统 Prompt 编辑、恢复默认、测试连接。

### 1.10 后台首页最近活动不可读

现状：

- Dashboard 最近活动直接显示：
  - `user.create`
  - `User`
  - `admin@xinmaowei.com`
- 用户不知道发生了什么。

必须修：

1. 后端 dashboard recentActivity 返回：
   - `actionLabel`
   - `targetLabel`
   - `description`
   - `actorEmail`
   - `createdAt`
2. 建立 action 映射：
   - `user.create` -> `创建用户`
   - `product.update` -> `更新产品`
   - `solution.delete` -> `删除方案`
   - `material.create` -> `上传资料`
   - `knowledge.create` -> `创建知识文档`
3. targetLabel 优先从 payload 取业务名称：
   - 用户邮箱
   - 产品型号
   - 方案名称
   - 资料标题
4. 前端显示为自然语言：
   - `管理员 admin@xinmaowei.com 创建了用户 test@example.com · 8 分钟前`
5. 对未知 action 做兜底，但不能直接裸显内部枚举。

## 2. 验收清单

必须全部通过才允许报告完成：

### 2.1 本地验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter server build
pnpm --filter client build
```

### 2.2 后台人工验收

1. 产品字段：
   - 新建单选字段，选项能保存。
   - 产品新建/编辑中下拉项正常显示。
   - 固定字段不重复出现。
2. 产品管理：
   - 新建产品。
   - 编辑产品。
   - 删除后默认列表不再出现。
   - 回收站/已删除筛选能看到。
3. 方案管理：
   - 新建方案关联多个产品。
   - 编辑方案能正确回填多个产品。
   - 删除后默认列表不再出现。
4. 资料管理：
   - 上传 PDF 并关联方案、产品。
   - 列表显示方案名、产品型号。
   - 编辑关联项能保存和回填。
   - 删除后默认列表不再出现。
5. 资料字段：
   - 新建单选/多选字段成功。
   - 如果实现 metadata，则上传/编辑资料时能填写并保存。
6. 角色管理：
   - 列表正常加载。
   - 权限列表正常加载。
   - 新建角色成功。
7. 用户管理：
   - 新建用户可选择 RBAC 角色。
   - 该用户重新登录后权限生效。
8. 系统设置：
   - 产品字段、资料字段、角色管理、AI及模型设置在同一分组下。
9. AI及模型设置：
   - API Key 脱敏显示。
   - 测试连接有成功/失败状态。
   - Prompt 可编辑、可恢复默认。
10. 后台首页：
   - 最近活动显示自然语言，不出现裸 `user.create` 作为主要文案。

### 2.3 线上验收

部署到 `172.16.172.85:8082` 后必须验证：

1. 首页资源 hash 已更新到新构建。
2. `GET /api/v1/health` 返回 healthy。
3. `/admin` 登录后无控制台异常。
4. 以上 2.2 人工验收至少走一遍。
5. 如可运行 Playwright，补充后台关键路径 E2E。

## 3. 禁止事项

- 禁止继续用 `undefined as unknown as string`、`any`、`@ts-ignore`、`eslint-disable`。
- 禁止只改前端提示，不修后端语义。
- 禁止把删除成功但仍在默认列表显示的问题归咎为“软删除预期”。
- 禁止新增 UI 页面但不接真实 API。
- 禁止 AI Key 明文返回给前端。
- 禁止提交 `.env.local`、cookie、截图、auth 缓存。

## 4. 完成报告必须包含

1. 最新分支和 SHA。
2. 每个根因对应的修复文件。
3. 新增 migration 名称。
4. 新增/修改 API 清单。
5. 本地验证命令和真实退出码。
6. 线上部署 SHA、前端 hash、容器状态。
7. 2.2 人工验收结果逐项截图或文字证明。
8. 未完成项必须明确说明，不允许写“基本完成”。
