# OpenCode 第二轮整改执行单

> 目标：修完当前后台真实功能缺口，补齐可配置能力，并确保这轮结果可以被人工验收与真实部署验证。本文是强制执行单，不是讨论稿。

## 1. 本轮审查结论

以下是**事实**，均来自当前工作区代码核查：

- 远程仓库目前**没有** `opencode/admin-ui-redesign` 分支；OpenCode 所说“已推送”不成立。
- 当前本地 `opencode/admin-ui-redesign` 比 `origin/master` 超前 3 个提交，但还不适合合并到 `master`。
- OpenCode 把 `client/e2e/screenshots/*.png` 真文件提交进了 Git 历史，与它“未提交截图”的报告不一致。
- `client/e2e/acceptance.spec.ts` 的后台验收只要求 `passed >= 5`，不是 8/8；这不是完整通过。
- 你新反馈的 5 个业务问题，当前代码里大部分仍然存在，不是部署残留。

## 2. 本轮必须修复的阻断项

### 2.1 产品字段改为后台可配置

当前问题：

- `client/src/features/admin/products/ProductFormModal.tsx` 把应用类型、能效等级、认证、参数字段全部写死在前端。
- `server/src/modules/products/products.schema.ts` 也把 `params` 结构写死。
- 这不满足“系统管理员可以自定义、删除、增加字段/选项”的要求。

必须这样改：

1. 新增“字段配置”能力，但**不要**把 Product 表结构改成海量列。
2. 采用“字段定义 + 值 JSON”模式：
   - 字段定义：`resourceType`、`fieldKey`、`label`、`fieldType`、`required`、`optionsJson`、`sortOrder`、`enabled`、`validationJson`
   - 值存储：产品仍保留 `params` JSON，但由字段定义驱动表单渲染与校验
3. 至少支持字段类型：
   - `text`
   - `number`
   - `single_select`
   - `multi_select`
   - `boolean`
4. 后台增加“产品字段设置”页：
   - 新增字段
   - 编辑标签、必填、排序、可选项
   - 停用字段
   - 禁止删除已作为系统核心标识的 `model`、`series`、`status`
5. 前后端都要按字段定义渲染与校验，不能再在前端写死选项。

验收标准：

- 管理员新增一个产品字段后，新建产品页立即出现该字段。
- 管理员修改某个枚举字段选项后，产品表单选项随之变化。
- 停用字段后，前台和后台表单都不再显示该字段。

### 2.2 方案关联产品必须真实可选且支持多选

当前问题：

- `client/src/features/admin/solutions/SolutionFormModal.tsx` 前端虽然写了多选，但你实测“无法选择芯片型号”。
- `server/src/modules/solutions/solutions.service.ts` 的 `getSolution` 返回 `products`，而 `client/src/api/admin-solutions.ts` 的 `AdminSolutionDetail` 却声明为 `productIds`，类型与真实响应不一致。
- 这会导致编辑态回填失效，也说明这块没被认真跑通。

必须这样改：

1. 统一方案详情接口返回：
   - `products`
   - `productIds`
   两者至少保留一个真实、稳定、被前端直接消费的结构，禁止“类型写一套、接口回一套”。
2. 新建方案与编辑方案都必须支持多选产品。
3. 产品下拉必须显示 `model + series`，并确认数据来自真实产品表。
4. 若产品数量较多，补充搜索能力；但禁止引入新依赖。

验收标准：

- 已有产品数据时，新建方案能选中多个产品并成功保存。
- 编辑方案时，已关联产品能正确回显。
- 保存后刷新列表或详情，关联产品数量与明细一致。

### 2.3 资料管理要修成功能与交互

当前问题：

- `client/src/features/admin/materials/MaterialUploadModal.tsx` 和 `MaterialEditModal.tsx` 仍是固定字段。
- 关联产品仍然是手填 `productId`，不是选择器。
- 方案选择存在异常，需要排查真实原因。
- `client/src/features/admin/materials/MaterialListPage.tsx` 的预览按钮直接打开 `/materials/:id/preview`，而该接口返回 JSON 包装，不是 PDF 流，所以浏览器显示 JSON。

必须这样改：

1. 资料字段同样采用“字段定义 + 元数据值”模式，不再写死。
2. 资料上传/编辑至少保留这些核心字段：
   - `title`
   - `type`
   - `status`
   - `solutionId`
   - `productId`
   - `file`
3. `solutionId` 和 `productId` 必须都改为选择器，不允许手填 ID。
4. 修复方案下拉无法选择的问题。
5. 修复预览逻辑：
   - 先请求预览接口获取 `{ url, previewPages }`
   - 再打开 `data.url`
   - 页面看到的必须是 PDF 预览，而不是 JSON 响应体
6. 若需要兼顾弹窗拦截，先打开空白窗口再异步跳转，或直接用前端内嵌预览组件处理。

验收标准：

- 上传真实 PDF 后，点击“预览”必须直接看到 PDF。
- 编辑资料时可改方案、产品、类型、标题、状态。
- 方案和产品都能通过下拉真实选择。

### 2.4 知识库新建文档必须支持真实上传流程

当前问题：

- `client/src/features/admin/knowledge/CreateKnowledgeModal.tsx` 只有：
  - `materialId`
  - `title`
  - `sourceType`
- 它要求手工输入“素材 ID”，没有上传，也没有选择器，这对后台用户不可用。
- `server/prisma/schema.prisma` 里 `KnowledgeDoc.materialId` 是唯一外键，这说明知识库文档当前是绑定资料实体的，不是独立裸文件。

必须这样改：

1. 保留 `KnowledgeDoc -> Material` 的关联，不要去掉。
2. 把“素材 ID”改成用户可理解的“来源资料”：
   - 方案 A：从现有资料中选择
   - 方案 B：在新建知识文档弹窗里直接上传文件，系统先自动创建 Material，再创建 KnowledgeDoc
3. 界面上禁止再暴露裸 `materialId` 文本框。
4. 若采用方案 B，必须明确默认资料类型、标题继承规则、失败回滚策略。
5. 知识文档创建后，必须能触发索引任务，并在列表中看到状态变化。

验收标准：

- 后台用户无需知道任何 ID，也能完成知识文档创建。
- 上传或选择资料后，知识文档能成功创建并进入索引流程。
- 列表中的“素材标题”能正确显示来源资料。

### 2.5 角色与权限必须可配置

当前问题：

- `server/prisma/schema.prisma` 使用 Prisma `enum Role { USER STAFF AUDITOR ADMIN }`
- `client/src/features/admin/users/UserFormModal.tsx`、`UserListPage.tsx`、`client/src/layouts/AdminLayout.tsx` 都把角色写死。
- 这不满足“可自定义角色名称、角色权限”的要求。

必须这样改：

1. 从固定枚举角色升级为可配置 RBAC：
   - `Role`
   - `Permission`
   - `RolePermission`
   - `UserRole` 或等效结构
2. 权限码必须稳定，例如：
   - `admin.dashboard.read`
   - `products.read`
   - `products.write`
   - `solutions.write`
   - `materials.write`
   - `knowledge.write`
   - `users.write`
   - `audit.read`
3. 保留系统内建角色作为种子数据，但不再把它们写死在前端逻辑中。
4. 后台新增“角色与权限管理”：
   - 新建角色
   - 修改角色名称
   - 配置权限集合
   - 给用户绑定角色
5. 路由菜单、接口权限、页面按钮可见性，全部改为读权限，而不是判断 `role === 'ADMIN'` 这类硬编码。
6. 不能删除仍被用户绑定的角色；不能让普通管理员删掉系统保底超级角色。

验收标准：

- 新建一个自定义角色后，可以分配给用户并生效。
- 去掉某权限后，对应菜单、页面、接口都会被拒绝。
- 前后端权限判断一致，不出现“页面能进但接口 403”或相反情况。

## 3. 必须顺手修掉的现存质量问题

### 3.1 修正后台验收脚本造假

`client/e2e/acceptance.spec.ts` 当前只要求后台 8 页里至少 5 页成功。

必须改为：

- 后台 8/8 页面全部通过才算通过
- 任何登录态丢失、重定向回 `/login`、严重 console error，都应直接 fail
- 不允许再写“5/8 也算过”的宽松断言

### 3.2 处理登录态连续跳转失效

当前 OpenCode 自己也承认后台连跳 5 页后可能掉登录态。

重点排查：

- `client/src/api/client.ts` 的 401 拦截器
- token 恢复时机
- 页面首次加载的鉴权恢复逻辑
- 是否存在并发刷新导致 `clearAuth()` 抢跑

验收标准：

- 同一登录态下连续访问后台 8 个页面，不掉登录。
- 刷新浏览器后，如 Refresh Cookie 有效，应能恢复会话。

## 4. 不允许做的错误动作

- 不允许为了“支持自定义字段”直接把所有字段都变成任意 JSON 且无配置定义。
- 不允许为了“支持自定义角色”只改前端下拉选项，而后端仍然是 enum。
- 不允许删除 `KnowledgeDoc.materialId` 关联来回避上传流程设计。
- 不允许把 `/materials/:id/preview` 改成直接返回永久对象存储地址。
- 不允许继续提交 `client/e2e/screenshots/*.png` 这类运行产物。
- 不允许报告“测试通过”，却在断言里容忍核心页面失败。

## 5. 本轮交付要求

OpenCode 完成后必须给出以下内容，缺一不可：

1. 分支名、提交 SHA、以及是否已经推送到远程。
2. 数据模型变更说明：
   - 新增哪些表
   - 哪些旧表/字段保留
   - 是否有 migration
3. 后台新增页面与路由清单。
4. 产品字段配置、资料字段配置、角色权限配置的真实截图路径。
5. 本地验证命令与真实退出码。
6. 局域网服务器重新部署时间、容器状态、健康检查结果。
7. 对以下场景的逐项验收结果：
   - 新建产品并使用自定义字段
   - 新建方案并多选关联产品
   - 上传资料并预览 PDF
   - 新建知识文档并完成索引
   - 新建自定义角色并绑定用户
8. 明确说明本轮仍未完成的点，不得再写模糊话术。
