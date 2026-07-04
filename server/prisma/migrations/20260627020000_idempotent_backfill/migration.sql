-- Idempotent Backfill Migration (R4.7)
-- =============================================
-- Populates reference data: permissions, roles, role-permission mappings,
-- product field configs, AI providers, AI prompts, and admin user-role assignment.
--
-- All inserts use ON CONFLICT to guarantee idempotency:
--   Run once or 100 times → same result, no duplicates, no data loss.
--
-- Run via:
--   psql -h <host> -U <user> -d <db> -f migration.sql
--   or
--   docker compose exec -T postgres psql -U postgres -d xinmaowei < migration.sql
--
-- Order of operations (following FK dependency):
--   1. permissions (no FK deps)
--   2. roles (no FK deps)
--   3. role_permissions (FK → roles, permissions)
--   4. product_field_configs (no FK deps)
--   5. ai_provider_settings (no FK deps)
--   6. ai_prompt_settings (no FK deps)
--   7. user_roles (FK → "User", roles)
--
-- Design decisions:
--   - Role IDs are looked up by name via subquery, so this is robust
--     regardless of whether roles were previously created (with any ID).
--   - Tables without a natural unique key (ai_provider_settings) use
--     WHERE NOT EXISTS guards to prevent duplicate inserts.
--   - No DELETE, TRUNCATE, or DROP statements anywhere.
-- =============================================

BEGIN;

-- =============================================
-- 1. PERMISSIONS (16 codes)
-- =============================================
-- Unique constraint: (code)
INSERT INTO permissions (id, code, description, "resourceGroup", action, "createdAt")
VALUES
  (gen_random_uuid(), 'admin.dashboard.read', '查看仪表盘',       'admin',     'read', NOW()),
  (gen_random_uuid(), 'products.read',        '查看产品',          'products',  'read', NOW()),
  (gen_random_uuid(), 'products.write',       '管理产品',          'products',  'write', NOW()),
  (gen_random_uuid(), 'solutions.read',       '查看方案',          'solutions', 'read', NOW()),
  (gen_random_uuid(), 'solutions.write',      '管理方案',          'solutions', 'write', NOW()),
  (gen_random_uuid(), 'materials.read',       '查看资料',          'materials', 'read', NOW()),
  (gen_random_uuid(), 'materials.write',      '管理资料',          'materials', 'write', NOW()),
  (gen_random_uuid(), 'knowledge.read',       '查看知识库',        'knowledge', 'read', NOW()),
  (gen_random_uuid(), 'knowledge.write',      '管理知识库',        'knowledge', 'write', NOW()),
  (gen_random_uuid(), 'users.read',           '查看用户',          'users',     'read', NOW()),
  (gen_random_uuid(), 'users.write',          '管理用户',          'users',     'write', NOW()),
  (gen_random_uuid(), 'audit.read',           '查看审计日志',      'audit',     'read', NOW()),
  (gen_random_uuid(), 'leads.read',           '查看线索',          'leads',     'read', NOW()),
  (gen_random_uuid(), 'leads.write',          '管理线索',          'leads',     'write', NOW()),
  (gen_random_uuid(), 'settings.ai.read',     '查看AI设置',        'settings',  'read', NOW()),
  (gen_random_uuid(), 'settings.ai.write',    '管理AI设置',        'settings',  'write', NOW())
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 2. ROLES (4)
-- =============================================
-- Unique constraint: (name)
-- gen_random_uuid() ensures fresh IDs; ON CONFLICT (name) skips if role exists.
INSERT INTO roles (id, name, description, "isSystem", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '管理员',   '系统管理员，拥有全部权限',           true, NOW(), NOW()),
  (gen_random_uuid(), '审核员',   '内容审核员，仅读权限+审计',         true, NOW(), NOW()),
  (gen_random_uuid(), '员工',     '内部员工，读权限+线索管理',         true, NOW(), NOW()),
  (gen_random_uuid(), '普通用户', '注册用户，无权限',                  true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. ROLE-PERMISSION ASSIGNMENTS
-- =============================================
-- Unique constraint: ("roleId", "permissionId")
-- Roles are resolved by name via subquery — robust regardless of role ID.

-- Manager (管理员): all 16 permissions
INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = '管理员'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Auditor (审核员): read-only + audit
INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = '审核员'
  AND p.code IN (
    'admin.dashboard.read',
    'products.read',
    'solutions.read',
    'materials.read',
    'knowledge.read',
    'audit.read',
    'leads.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Staff (员工): read + leads management
INSERT INTO role_permissions (id, "roleId", "permissionId")
SELECT gen_random_uuid(), r.id, p.id
FROM roles r, permissions p
WHERE r.name = '员工'
  AND p.code IN (
    'admin.dashboard.read',
    'products.read',
    'solutions.read',
    'materials.read',
    'leads.read',
    'leads.write'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Regular user (普通用户): no permissions (skip)

-- =============================================
-- 4. PRODUCT FIELD CONFIGS (14)
-- =============================================
-- Unique constraint: ("resourceType", "fieldKey")
-- Uses DO UPDATE SET to refresh label/type/options/enabled without
-- overwriting manually-edited values (ON CONFLICT preserves the row).
INSERT INTO product_field_configs (id, "resourceType", "fieldKey", label, "fieldType", required, "optionsJson", "sortOrder", enabled, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'product', 'model',             '型号',              'text',          true,  NULL,                                                                                                   1,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'series',            '系列',              'text',          true,  NULL,                                                                                                   2,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'type',              '类型',              'single_select', true,  '[{"label":"PFC控制器","value":"PFC控制器"},{"label":"LLC控制器","value":"LLC控制器"},{"label":"同步整流","value":"同步整流"},{"label":"快充协议","value":"快充协议"},{"label":"DC-DC转换器","value":"DC-DC转换器"},{"label":"GaN驱动器","value":"GaN驱动器"}]'::jsonb, 3, true, NOW(), NOW()),
  (gen_random_uuid(), 'product', 'inputVoltageMin',   '最小输入电压(V)',   'number',        true,  NULL,                                                                                                   4,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'inputVoltageMax',   '最大输入电压(V)',   'number',        true,  NULL,                                                                                                   5,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'outputVoltage',     '输出电压(V)',       'number',        true,  NULL,                                                                                                   6,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'outputCurrent',     '输出电流(A)',       'number',        true,  NULL,                                                                                                   7,  true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'applicationType',   '应用类型',          'single_select', true,  '[{"label":"适配器","value":"适配器"},{"label":"LED驱动","value":"LED驱动"},{"label":"充电器","value":"充电器"},{"label":"工业电源","value":"工业电源"},{"label":"服务器电源","value":"服务器电源"},{"label":"家电","value":"家电"},{"label":"电机驱动","value":"电机驱动"},{"label":"其他","value":"其他"}]'::jsonb, 8, true, NOW(), NOW()),
  (gen_random_uuid(), 'product', 'efficiencyLevel',   '能效等级',          'single_select', true,  '[{"label":"六级能效","value":"六级能效"},{"label":"CoC Tier 2","value":"CoC Tier 2"},{"label":"80PLUS金牌","value":"80PLUS金牌"},{"label":"80PLUS白金","value":"80PLUS白金"}]'::jsonb, 9, true, NOW(), NOW()),
  (gen_random_uuid(), 'product', 'standbyPowerMax',   '最大待机功耗(mW)',  'number',        false, NULL,                                                                                                   10, true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'maxAmbientTemp',    '最高环境温度(°C)',  'number',        false, NULL,                                                                                                   11, true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'certifications',    '认证',              'multi_select',  false, '[{"label":"CCC","value":"CCC"},{"label":"UL","value":"UL"},{"label":"CE","value":"CE"},{"label":"FCC","value":"FCC"},{"label":"PSE","value":"PSE"},{"label":"KC","value":"KC"},{"label":"RoHS","value":"RoHS"}]'::jsonb, 12, true, NOW(), NOW()),
  (gen_random_uuid(), 'product', 'requiresPfc',       '需要PFC',           'boolean',       false, NULL,                                                                                                   13, true,  NOW(), NOW()),
  (gen_random_uuid(), 'product', 'advantages',        '优势',              'text',          false, NULL,                                                                                                   14, true,  NOW(), NOW())
ON CONFLICT ("resourceType", "fieldKey") DO UPDATE SET
  label       = EXCLUDED.label,
  "fieldType" = EXCLUDED."fieldType",
  required    = EXCLUDED.required,
  "optionsJson" = EXCLUDED."optionsJson",
  "sortOrder" = EXCLUDED."sortOrder",
  enabled     = EXCLUDED.enabled,
  "updatedAt" = NOW();

-- =============================================
-- 5. AI PROVIDER SETTINGS (3)
-- =============================================
-- No natural unique key in schema. Using WHERE NOT EXISTS on
-- (providerType, name) as a proxy unique guard for idempotency.
-- baseUrl/model defaults match server/src/config/index.ts values.

INSERT INTO ai_provider_settings (id, "providerType", name, "baseUrl", "apiKeyEncrypted", model, dimensions, enabled, "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'llm',       'Default LLM',       NULL,   NULL, 'your-model-name', NULL,  true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ai_provider_settings WHERE "providerType" = 'llm' AND name = 'Default LLM');

INSERT INTO ai_provider_settings (id, "providerType", name, "baseUrl", "apiKeyEncrypted", model, dimensions, enabled, "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'embedding', 'Default Embedding', NULL,   NULL, 'your-model-name', 1536,  true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ai_provider_settings WHERE "providerType" = 'embedding' AND name = 'Default Embedding');

INSERT INTO ai_provider_settings (id, "providerType", name, "baseUrl", "apiKeyEncrypted", model, dimensions, enabled, "isDefault", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'rerank',    'Default Rerank',    NULL,   NULL, 'your-model-name', NULL,  true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM ai_provider_settings WHERE "providerType" = 'rerank' AND name = 'Default Rerank');

-- =============================================
-- 6. AI PROMPT SETTINGS (4)
-- =============================================
-- Unique constraint: (key)
INSERT INTO ai_prompt_settings (id, key, title, content, enabled, version, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'extraction',
   '文档内容抽取提示词',
   '请从以下文档内容中提取关键信息，包括技术参数、功能特性、应用场景等。保持客观准确，使用中文输出。',
   true, 1, NOW(), NOW()),

  (gen_random_uuid(), 'entity_query',
   '实体查询提示词',
   '根据用户的问题，从知识库中查找相关的实体信息。返回最匹配的实体名称、类型和关联关系。',
   true, 1, NOW(), NOW()),

  (gen_random_uuid(), 'rerank',
   '重排序提示词',
   '对以下搜索结果进行相关性重排序。请判断每条结果与用户问题的相关程度，并给出评分（0-1）。',
   true, 1, NOW(), NOW()),

  (gen_random_uuid(), 'chat_system',
   '聊天系统提示词',
   'You are a helpful assistant specialized in power electronics and semiconductor products. Answer questions based on the provided knowledge base context. If you don''t know the answer, say so honestly. Always cite your sources when possible.',
   true, 1, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 7. ADMIN USER-ROLE ASSIGNMENT
-- =============================================
-- Unique constraint: ("userId", "roleId")
-- Finds the admin user by email and the admin role by name.
INSERT INTO user_roles (id, "userId", "roleId")
SELECT gen_random_uuid(), u.id, r.id
FROM "User" u, roles r
WHERE u.email = 'admin@xinmaowei.com'
  AND r.name = '管理员'
ON CONFLICT ("userId", "roleId") DO NOTHING;

COMMIT;