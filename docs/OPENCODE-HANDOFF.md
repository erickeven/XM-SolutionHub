# OpenCode 接管实施与局域网运维手册

> 目标：完成后台管理、全站 UI 重设计，并在 `172.16.172.85` 上独立部署、测试和排障。本文是执行合同，不是建议清单。

## 1. 已验证事实

- 项目根目录：Windows 本机当前 Git 工作区。
- 生产地址：`http://172.16.172.85:8082`。
- 服务器目录：`/opt/xinmaowei`。
- 编排文件：`docker-compose.prod.yml`。
- 生产服务：PostgreSQL、Redis、MinIO、API、Worker、Nginx。
- 服务器 HTTP/SOCKS5 代理监听：`127.0.0.1:37890`，由现有 Docker Proxy 服务提供。
- SSH 参数只从根目录 `.env.local` 读取：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PASSWORD`、`DEPLOY_PORT`。
- `.env.local` 已忽略，禁止提交、打印或复制到服务器。
- 服务器生产环境文件是 `/opt/xinmaowei/.env`，禁止覆盖。
- 局域网当前使用 HTTP，生产环境已明确配置 `COOKIE_SECURE=false`。
- 管理员凭据保存在服务器 `/root/xm-solutionhub-deploy-credentials.txt`，只能在测试进程内读取，禁止写入报告。
- 2026-06-24 已完成一次 PostgreSQL 与空 MinIO Bucket 的隔离恢复演练。

## 2. 强制工作方式

1. 从最新 `origin/master` 创建 `opencode/admin-ui-redesign`，禁止直接在 `master` 开发。
2. 先阅读 `AGENTS.md`、`docs/PRD.md`、`docs/design.md`、`docs/tech.md` 和本文件。
3. 修改前先检查真实路由、接口、类型和数据库模型；禁止根据页面文案猜接口。
4. 复用 React、Ant Design、Tailwind、React Query 和现有组件，禁止新增依赖。
5. 所有页面接真实 API，禁止假数据、静态统计值、模拟成功和空壳按钮。
6. 每一阶段单独提交；每次提交前运行对应验证命令。
7. 部署后必须执行真实浏览器验收，不能以 `build` 通过代替 UI 验收。
8. 不得执行 `docker compose down -v`、删除生产 Volume、覆盖 `.env` 或直接恢复生产数据库。

## 3. 阶段 A：完善后台管理

### 3.1 已知缺陷

`client/src/App.tsx` 当前用 `/admin/*` 渲染 `PlaceholderPage`，所以访问 `/admin` 只显示“后台管理 / 页面建设中”。上线清单中“后台全部资源已完成”的表述与真实前端不一致。

### 3.2 必须交付

- 新建独立 `AdminLayout`，包含紧凑侧栏、页面标题/面包屑、角色可见菜单、当前用户和退出入口。
- `/admin`：真实管理驾驶舱，展示产品、方案、资料、知识文档、线索、用户的统计和待处理项。
- `/admin/products`：列表、搜索、筛选、新建、编辑、上下架或删除，接管理端产品 API。
- `/admin/solutions`：列表、筛选、新建、编辑、关联产品和删除，接管理端方案 API。
- `/admin/materials`：列表、上传、元数据编辑、权限级别、关联方案、预览和删除。
- 将现有知识库、线索、用户、审计、Trace 页面纳入统一后台布局。
- `/admin/*` 未知路径返回后台 404，不再出现“页面建设中”。
- `STAFF` 只能访问授权线索功能；`AUDITOR` 增加审核/分配能力；`ADMIN` 可访问全部菜单和路由。
- 四态齐全：加载、空数据、接口错误、无权限；删除和高风险状态变更必须二次确认。
- 操作成功后刷新精确 Query Key；失败显示后端可读错误，不得静默吞错。

### 3.3 数据约束

- 优先复用 `/api/v1/admin/products`、`solutions`、`materials`、`knowledge`、`leads`、`users`、`audit`。
- 驾驶舱所需聚合数据若现有接口无法可靠提供，可新增一个最小的 `/api/v1/admin/dashboard` 聚合接口。
- 新接口必须遵循 Route → Controller → Service → Repository、Zod 校验、RBAC 和统一响应格式。
- 资料上传必须使用 `multipart/form-data`；永久存储地址不能返回给浏览器。

### 3.4 阶段验收

```bash
pnpm --filter server typecheck
pnpm --filter client typecheck
pnpm lint
pnpm --filter server test
pnpm --filter client test
pnpm --filter client build
```

管理员逐页完成一轮新建、读取、编辑、删除；`STAFF` 账号验证越权路径被拒绝。

## 4. 阶段 B：全站 UI 重设计

### 4.1 设计目标

这是工程师高频使用的芯片选型与资料系统，不是营销模板。整体应专业、克制、精密，强调参数扫描、横向比较和连续操作效率。

- 保留深海军蓝、芯片铜金、工业灰，但不得整页只有同一蓝色。
- 前台首屏直接呈现选型入口和真实产品信号，不做大段口号或巨大空白 Hero。
- 后台采用密度合理的工作台，不使用层层嵌套卡片和装饰性大圆角。
- 卡片圆角不超过 `8px`；按钮、表格、筛选栏和抽屉保持统一尺寸体系。
- 图标只用现有 Ant Design Icons；图标按钮提供 Tooltip。
- 禁止渐变球、光斑、廉价玻璃拟态、全页渐变、夸张阴影和无意义动效。
- 禁止把每个区块都包成悬浮卡片；页面区段使用清晰网格、分隔和留白。
- 所有文字在 360px、768px、1440px 视口内不得溢出、遮挡或横向滚动。

### 4.2 重设计范围

- 全局 Theme Token、排版层级、页面容器、Header、Footer、移动导航。
- 首页、选型、产品详情、方案列表/详情、资料预览、登录注册、个人中心。
- AI 会话列表、消息区、来源面板、反馈状态和 SSE 等待/错误状态。
- 阶段 A 的全部后台页面。
- 表单、表格、筛选、分页、Modal、Drawer、Empty、Result、Skeleton 和错误提示。

### 4.3 页面级原则

- 首页：首屏内完成关键参数输入并能开始选型，下方露出热门产品或方案。
- 选型：桌面端筛选与结果并列，移动端筛选放 Drawer；比较条不能遮挡内容。
- 产品详情：核心参数优先，参数矩阵可扫描，关联方案和资料层级清楚。
- 资料页：文件类型、权限、版本、更新时间和动作必须一眼可辨。
- AI 问答：消息阅读宽度受控，来源引用与答案明确关联，无来源不得显示确定性答案。
- 后台：筛选和批量动作靠近数据，表格列按任务优先级排序，避免横向滚动。

### 4.4 UI 验收矩阵

每个核心页面至少检查 `360x800`、`768x1024`、`1440x900`：

- 无水平滚动、重叠、截断、跳动和空白首屏。
- 浏览器 Console 无 error，失败请求有可见处理。
- 键盘可访问主要操作，焦点样式清晰。
- 加载、空、错误、无权限均有真实状态。
- 截图逐页人工审查；只通过类型检查不算完成。

## 5. Windows 无 GUI SSH 操作

FinalShell 能连接不代表 OpenCode 必须控制 FinalShell。Windows 自带 `ssh`/`scp` 即可。以下 PowerShell 会从 `.env.local` 注入密码，临时脚本不包含密码本身。

```powershell
$deploy = @{}
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $deploy[$matches[1]] = $matches[2] }
}

$askpass = Join-Path $env:TEMP 'xm-ssh-askpass.cmd'
Set-Content -LiteralPath $askpass -Encoding Ascii -Value '@echo off
powershell.exe -NoProfile -Command "[Console]::Out.Write($env:DEPLOY_PASSWORD)"'

$env:DEPLOY_PASSWORD = $deploy.DEPLOY_PASSWORD
$env:SSH_ASKPASS = $askpass
$env:SSH_ASKPASS_REQUIRE = 'force'
$env:DISPLAY = '1'
$target = "$($deploy.DEPLOY_USER)@$($deploy.DEPLOY_HOST)"

ssh -p $deploy.DEPLOY_PORT -o StrictHostKeyChecking=accept-new $target 'uname -a; id; pwd'
```

每次任务结束执行：

```powershell
Remove-Item -LiteralPath $askpass -Force
Remove-Item Env:DEPLOY_PASSWORD -ErrorAction SilentlyContinue
```

规则：禁止 `Write-Host $deploy`，禁止回显 `.env.local`，禁止把 AskPass 文件建在仓库内。

## 6. 服务器代理使用

先检查代理，不要擅自重建或改端口：

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | grep -i proxy
docker inspect Proxy 2>/dev/null || true
curl -I -x http://127.0.0.1:37890 https://github.com
```

单条命令临时使用代理：

```bash
HTTP_PROXY=http://127.0.0.1:37890 \
HTTPS_PROXY=http://127.0.0.1:37890 \
NO_PROXY=127.0.0.1,localhost,postgres,redis,minio,api,nginx \
git ls-remote https://github.com/erickeven/XM-SolutionHub.git HEAD
```

若 Docker Hub 仍失败，先检查现有镜像源；已验证的备用前缀是 `docker.1ms.run/`。禁止为了拉一个镜像重写全局 Docker 配置。

## 7. 发布到局域网服务器

### 7.1 发布前

```bash
git status --short
git log -1 --oneline
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter client build
```

必须工作区干净，并记录待发布提交 SHA。然后在 Windows PowerShell 生成只含已跟踪文件的发布包：

```powershell
$release = Join-Path $env:TEMP "xm-release-$(git rev-parse --short HEAD).tar"
git archive --format=tar -o $release HEAD
scp -P $deploy.DEPLOY_PORT $release "${target}:/tmp/xm-release.tar"
```

### 7.2 服务器备份与更新

```bash
cd /opt/xinmaowei
set -euo pipefail
stamp=$(date +%Y%m%d-%H%M%S)
bash docs/ops/backup-full.sh "$PWD/backups/predeploy-$stamp"
tar --exclude=.env --exclude=backups --exclude=node_modules \
  -czf "/opt/xinmaowei-code-$stamp.tgz" .
tar -xf /tmp/xm-release.tar -C /opt/xinmaowei
rm -f /tmp/xm-release.tar
chmod 600 .env
docker compose -f docker-compose.prod.yml config -q
docker compose -f docker-compose.prod.yml build api worker nginx
docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

若 Git 提交删除了文件，发布包不会自动删除服务器旧文件；必须从 `git diff --name-status <上次SHA>..HEAD` 获取 `D` 项，逐一核对后在服务器删除。

### 7.3 发布验证

```bash
cd /opt/xinmaowei
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api worker nginx
curl -fsS http://127.0.0.1:3001/api/v1/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8082/
```

必须继续用真实浏览器访问 `http://172.16.172.85:8082`，验证登录刷新、后台 CRUD、三视口布局、Console 和 Network。测试创建的数据在完成后删除。

## 8. 排障与回滚

定位顺序：

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 worker
docker compose -f docker-compose.prod.yml logs --tail=200 nginx
docker inspect xm-api --format '{{json .State.Health}}'
docker exec xm-nginx wget -qO- http://api:3001/api/v1/health
```

- `502`：先查 API 健康和 Nginx 到 `api:3001` 的连通性。
- 登录刷新失效：检查 `COOKIE_SECURE=false`、`WEB_ORIGIN`、Refresh Cookie 和 CSRF 请求头。
- Worker 不消费：查 Redis、Worker 日志、索引任务状态和 Embedding 配置。
- 外网失败：先用 `curl -x` 验证 Proxy，再判断是代理、DNS 还是目标服务问题。

代码回滚使用发布前的 `/opt/xinmaowei-code-*.tgz` 覆盖代码并重新构建；`.env` 和数据 Volume 不动。数据库迁移没有自动回滚，涉及 Schema 时必须先说明迁移影响，获得确认后再恢复备份。

## 9. 最终交付格式

OpenCode 完成后必须提供：

1. 分支名和提交 SHA。
2. 后台已完成路由及对应真实 API。
3. UI 改造页面清单和三视口截图路径。
4. 本地验证命令及真实退出码，不得只写“通过”。
5. 服务器部署时间、容器状态、健康响应和浏览器验收结果。
6. 新增/修改的环境变量，但不得提供值。
7. 已知限制、未验证项和复现步骤。
8. 确认没有提交 `.env`、凭据、上传文件、测试截图缓存和临时 AskPass 文件。
