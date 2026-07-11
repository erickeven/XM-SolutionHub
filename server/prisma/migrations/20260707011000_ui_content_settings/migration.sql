CREATE TABLE "ui_content_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "group" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ui_content_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ui_content_settings_key_key" ON "ui_content_settings"("key");
CREATE INDEX "ui_content_settings_group_idx" ON "ui_content_settings"("group");

INSERT INTO "ui_content_settings" (
  id,
  key,
  "group",
  label,
  value,
  enabled,
  "createdAt",
  "updatedAt"
)
VALUES
  (gen_random_uuid(), 'main.nav.home', 'main', '导航：首页', '首页', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.nav.selection', 'main', '导航：选型', '选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.nav.solutions', 'main', '导航：方案资料', '方案资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.nav.ai', 'main', '导航：AI问答', 'AI问答', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.nav.profile', 'main', '导航：我的', '我的', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.cta.chat', 'main', '开始对话按钮', '开始对话', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.footer.description', 'main', '页脚说明', '专业的电源芯片选型与方案资料平台，毫秒级匹配、可解释推荐、全规格书可预览。', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.footer.selection', 'main', '页脚：智能选型', '智能选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'main.footer.ai', 'main', '页脚：AI 技术问答', 'AI 技术问答', true, NOW(), NOW()),
  (gen_random_uuid(), 'auth.login', 'auth', '登录按钮', '登录', true, NOW(), NOW()),
  (gen_random_uuid(), 'auth.register', 'auth', '注册按钮', '注册', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.hero.title', 'home', '首页主标题', '芯茂微智能选型平台', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.hero.subtitle', 'home', '首页主说明', '输入电气参数即可匹配可解释型号，联动规格书、方案资料与 AI 技术问答，减少工程师在资料表之间反复查找的时间。', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.quick.title', 'home', '快速选型标题', '快速选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.quick.hint', 'home', '快速选型说明', '核心电气参数必填，应用与认证可选', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.quick.submit', 'home', '快速选型按钮', '开始选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.solutions.title', 'home', '热门方案标题', '热门应用方案', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.solutions.view', 'home', '查看方案按钮', '查看方案资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.solutions.empty', 'home', '热门方案空态', '暂无已上架方案', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.products.title', 'home', '推荐型号标题', '推荐型号', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.products.enterSelection', 'home', '完整选型入口', '进入完整选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.products.empty', 'home', '推荐型号空态', '暂无推荐型号', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.ai.title', 'home', 'AI 模块标题', 'AI 技术问答', true, NOW(), NOW()),
  (gen_random_uuid(), 'home.ai.subtitle', 'home', 'AI 模块说明', '用自然语言描述需求，系统会基于资料库返回带来源的回答，方便追溯到规格书页码和方案片段。', true, NOW(), NOW()),
  (gen_random_uuid(), 'common.loading', 'common', '加载中', '加载中...', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.title', 'solutions', '方案列表标题', '方案资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.subtitle', 'solutions', '方案列表说明', '按应用方案查看关联型号、测试报告与设计资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.search.placeholder', 'solutions', '方案搜索占位', '搜索方案名称或应用场景', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.error', 'solutions', '方案加载失败', '方案加载失败', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.empty', 'solutions', '方案列表空态', '暂无已上架方案', true, NOW(), NOW()),
  (gen_random_uuid(), 'solutions.card.view', 'solutions', '方案卡片查看按钮', '查看方案与资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.detail.notFound', 'solutions', '方案详情不存在', '方案未找到', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.detail.backSelection', 'solutions', '返回选型按钮', '返回选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.material.catalog', 'solutions', '资料目录标题', '资料目录', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.material.empty', 'solutions', '资料空态', '资料整理中', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.material.previewTag', 'solutions', '匿名预览标签', '前3页', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.material.loadFailed', 'solutions', '资料加载失败', '资料加载失败', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.tabs.materials', 'solutions', '资料 Tab', '资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.tabs.preview', 'solutions', '预览 Tab', '预览', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.tabs.products', 'solutions', '关联型号 Tab', '关联型号', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.products.empty', 'solutions', '关联型号空态', '暂无关联型号', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.preview.empty', 'solutions', '未选择资料提示', '请选择资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.preview.error', 'solutions', '预览失败标题', '预览加载失败', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.preview.retry', 'solutions', '预览重试按钮', '重试', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.preview.limited', 'solutions', '匿名预览提示', '当前显示前 {pages} 页预览，登录后查看完整资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'solution.preview.unlock', 'solutions', '登录查看完整资料按钮', '登录/注册查看完整资料', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.backSelection', 'products', '产品返回选型', '返回选型', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.notFound', 'products', '产品不存在', '产品未找到', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.loadFailed', 'products', '产品加载失败', '加载失败', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.inactive', 'products', '产品下架提示', '产品已下架', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.material.complete', 'products', '资料完整标签', '资料完整', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.material.preparing', 'products', '资料整理中标签', '资料整理中', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.params.title', 'products', '关键参数标题', '关键参数', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.applications.title', 'products', '推荐应用标题', '推荐应用', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.advantages.title', 'products', '产品优势标题', '产品优势', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.datasheet.title', 'products', '产品规格书标题', '规格书', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.datasheet.previewable', 'products', '规格书可预览标签', '可预览', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.datasheet.view', 'products', '查看规格书按钮', '查看规格书', true, NOW(), NOW()),
  (gen_random_uuid(), 'product.solutions.title', 'products', '关联方案标题', '关联方案', true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (id, code, description, "resourceGroup", action, "createdAt")
VALUES
  (gen_random_uuid(), 'settings.ui.read',  '查看前端文案', 'settings', 'read',  NOW()),
  (gen_random_uuid(), 'settings.ui.write', '管理前端文案', 'settings', 'write', NOW())
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  "resourceGroup" = EXCLUDED."resourceGroup",
  action = EXCLUDED.action;

INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('settings.ui.read', 'settings.ui.write')
WHERE r.name = '管理员'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
